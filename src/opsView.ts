import * as vscode from 'vscode';
import * as path from 'path';
import * as iconv from 'iconv-jschardet';
import MarkdownEngine from './markdown/markdownEngine';

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
        const md = new MarkdownEngine();
        const [content, manager] = md.render(resource.getText());
        panel.webview.html = webviewContent(content, context);
        panel.webview.onDidReceiveMessage(
            message => {
                const scriptChunk = manager.getScript(message.scriptId);
                switch (message.command) {
                    case 'executeCommand':
                        const proc = scriptChunk.spawnProcess();
                        proc.stdout.on('data', data => {
                            panel.webview.postMessage({ event: 'stdout', scriptId: message.scriptId, data: iconv.decode(data, iconv.detect(data).encoding).toString() });
                        });
                        proc.stderr.on('data', data => {
                            panel.webview.postMessage({ event: 'stderr', scriptId: message.scriptId, data: iconv.decode(data, iconv.detect(data).encoding).toString() });
                        });
                        proc.on('close', code => {
                            panel.webview.postMessage({ event: 'complete', scriptId: message.scriptId, code: code });
                        });
                        proc.on('error', err => {
                            panel.webview.postMessage({ event: 'error', scriptId: message.scriptId, name: err.name, message: err.message });
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