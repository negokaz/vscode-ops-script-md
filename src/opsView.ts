import * as vscode from 'vscode';
import * as path from 'path';
import * as iconv from 'iconv-jschardet';
import MarkdownEngine from './markdown/markdownEngine';
import * as PubSub from 'pubsub-js';
import { StdoutProduced, StderrProduced, ProcessCompleted, SpawnFailed, LogLoaded, ExecutionStarted } from './scriptChunk/processEvents';
import ScriptChunkManager from './scriptChunk/scriptChunkManager';
import * as jsYaml from 'js-yaml';
import * as fs from 'fs';

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
            'OpsView: ' + path.basename(resource.uri.path),
            viewColumn,
            {
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, resourceDirectoryName))],
                enableScripts: true,
                retainContextWhenHidden: true,
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
                        PubSub.publish(ExecutionStarted.topic, new ExecutionStarted(scriptChunkId, new Date()));
                        const proc = scriptChunk.spawnProcess();
                        proc.stdout.on('data', data => {
                            PubSub.publish(StdoutProduced.topic, new StdoutProduced(scriptChunkId, iconv.decode(data, iconv.detect(data).encoding).toString()));
                        });
                        proc.stderr.on('data', data => {
                            PubSub.publish(StderrProduced.topic, new StderrProduced(scriptChunkId, iconv.decode(data, iconv.detect(data).encoding).toString()));
                        });
                        proc.on('close', code => {
                            PubSub.publish(ProcessCompleted.topic, new ProcessCompleted(scriptChunkId, code, new Date()));
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
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const rootPath = vscode.workspace.workspaceFolders[0].uri.path;
            const logDir = path.join(rootPath, 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir);
            }
            const logFilename = path.basename(resource.uri.path, path.extname(resource.uri.path)) + '.log.yml';
            publishLog(manager, path.join(logDir, logFilename));
            subscribeToPersistEvents(manager, path.join(logDir, logFilename));
        }
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
    PubSub.subscribe(LogLoaded.topic, (_: any, event: LogLoaded) => {
        webview.postMessage({ event: 'log', scriptChunkId: event.scriptChunkId, output: event.output });
    });
}

function publishLog(manager: ScriptChunkManager, logPath: string) {
    const logs: any = jsYaml.safeLoad(fs.readFileSync(logPath, 'utf8'));
    for (let id in logs) {
        PubSub.publish(LogLoaded.topic, new LogLoaded(id, logs[id].output));
    }
}

function subscribeToPersistEvents(manager: ScriptChunkManager, logPath: string) {
    const logs: any = {};
    
    function getLog(scriptChunkId: string) {
        const log = logs[scriptChunkId] ? logs[scriptChunkId] : {command: '', start: '', end: '', output: ''};
        logs[scriptChunkId] = log;
        return log;
    }

    PubSub.subscribe(ExecutionStarted.topic, (_: any, event: ExecutionStarted) => {
        const log = getLog(event.scriptChunkId);
        log.command = manager.getScriptChunk(event.scriptChunkId).commandLine;
        log.output = '';
        log.start = event.startTime.toLocaleString();
    });
    PubSub.subscribe(StdoutProduced.topic, (_: any, event: StdoutProduced) => {
        const log = getLog(event.scriptChunkId);
        log.output = log.output + event.data;
    });
    PubSub.subscribe(StderrProduced.topic, (_: any, event: StderrProduced) => {
        const log = getLog(event.scriptChunkId);
        log.output = log.output + event.data;
    });
    PubSub.subscribe(ProcessCompleted.topic, (_: any, event: ProcessCompleted) => {
        const log = getLog(event.scriptChunkId);
        log.end = event.endTime.toLocaleString();
        console.log(jsYaml.safeDump(logs));
        fs.writeFileSync(logPath, jsYaml.safeDump(logs));
    });
    PubSub.subscribe(SpawnFailed.topic, (_: any, event: SpawnFailed) => {
        const log = getLog(event.scriptChunkId);
        log.output = log.output + event.cause.name + event.cause.message;
    });
    PubSub.subscribe(LogLoaded.topic, (_: any, event: LogLoaded) => {
        const log = getLog(event.scriptChunkId);
        log.output = log.output + event.output;
    });
}