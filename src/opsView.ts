import * as vscode from 'vscode';
import * as path from 'path';
import * as iconv from 'iconv-jschardet';
import MarkdownEngine from './markdown/markdownEngine';
import * as PubSub from 'pubsub-js';
import { StdoutProduced, StderrProduced, ProcessCompleted, SpawnFailed } from './scriptChunk/processEvents';

const resourceDirectoryName = 'media';

export default function openOpsView(context: vscode.ExtensionContext, viewColumn: vscode.ViewColumn) {
    iconv.disableCodecDataWarn();
    return () => {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showErrorMessage("None active text editor.");
            return;
        }

        const resource = vscode.window.activeTextEditor.document;

        const panel = vscode.window.createWebviewPanel(
            'OpsView',
            'Ops View',
            viewColumn,
            {
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, resourceDirectoryName))],
                enableScripts: true,
            }
        );
        subscribeEvents(panel.webview);
        const md = new MarkdownEngine();
        const [content, manager] = md.render(resource.getText());
        panel.webview.html = webviewContent(content, context);
        panel.webview.onDidReceiveMessage(
            message => {
                const scriptChunkId = message.scriptChunkId;
                const scriptChunk = manager.getScriptChunk(scriptChunkId);
                switch (message.command) {
                    case 'executeScriptChunk':
                        const proc = scriptChunk.spawnProcess();
                        proc.stdout.on('data', data => {
                            PubSub.publish(StdoutProduced.topic, new StdoutProduced(scriptChunkId, iconv.decode(data, iconv.detect(data).encoding).toString()));
                        });
                        proc.stderr.on('data', data => {
                            PubSub.publish(StderrProduced.topic, new StderrProduced(scriptChunkId, iconv.decode(data, iconv.detect(data).encoding).toString()));
                        });
                        proc.on('close', code => {
                            PubSub.publish(ProcessCompleted.topic, new ProcessCompleted(scriptChunkId, code));
                        });
                        proc.on('error', err => {
                            PubSub.publish(SpawnFailed.topic, new SpawnFailed(scriptChunkId, err));
                        });
                        return;
                    case 'killScriptChunk':
                        scriptChunk.killProcess();
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    };
}

function webviewContent(content: string, context: vscode.ExtensionContext): string {
    return `<!DOCTYPE html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${resourceUri(context, 'css', 'markdown.css')}">
    <link rel="stylesheet" href="${resourceUri(context, 'css', 'ops-view.css')}">
    <link rel="stylesheet" href="${resourceUri(context, 'css', 'highlight.css')}">
    <script src="${resourceUri(context, 'js', 'ops-view.js')}"></script>
</head>
<body>
    ${content}
</body>
</html>
`;
}

function resourceUri(context: vscode.ExtensionContext, ...pathElements: string[]): vscode.Uri {
    const onDiskPath = vscode.Uri.file(
        path.join(context.extensionPath, resourceDirectoryName, path.join(...pathElements))
    );
    return onDiskPath.with({ scheme: 'vscode-resource' });
}

function subscribeEvents(webview: vscode.Webview) {
    PubSub.subscribe(StdoutProduced.topic, (_: any, event: StdoutProduced) => {
        webview.postMessage({ event: 'stdout', scriptChunkId: event.scriptChunkId, data: event.data });
    });
    PubSub.subscribe(StderrProduced.topic, (_: any, event: StderrProduced) => {
        webview.postMessage({ event: 'stderr', scriptChunkId: event.scriptChunkId, data: event.data });
    });
    PubSub.subscribe(ProcessCompleted.topic, (_: any, event: ProcessCompleted) => {
        webview.postMessage({ event: 'complete', scriptChunkId: event.scriptChunkId, code: event.exitCode });
    });
    PubSub.subscribe(SpawnFailed.topic, (_: any, event: SpawnFailed) => {
        webview.postMessage({ event: 'error', scriptChunkId: event.scriptChunkId, name: event.cause.name, message: event.cause.message });
    });
}