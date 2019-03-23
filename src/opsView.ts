import * as vscode from 'vscode';

export default function openOpsView(context: vscode.ExtensionContext) {
    return () => {
        const panel = vscode.window.createWebviewPanel(
            'OpsView',
            'Ops View',
            vscode.ViewColumn.Active,
            {
                enableScripts: true
            }
        );
        panel.webview.html = "test";
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
    }
}