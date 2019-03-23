import * as vscode from 'vscode';
import * as path from 'path';
import * as MarkdownIt from 'markdown-it';
import scriptChunk from './markdown-it-plugins/scriptChunk';
import * as hljs from 'highlight.js';

const resourceDirectoryName = 'media';

export default function openOpsView(context: vscode.ExtensionContext, viewColumn: vscode.ViewColumn) {

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
        const md = new MarkdownIt({
            highlight: (str, lang) => {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(lang, str).value;
                    } catch (__) {}
                }
                return '';
            }
        });
        md.use(scriptChunk);
        const content = md.render(resource.getText());
        panel.webview.html = webviewContent(content, context);
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'executeCommand':
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