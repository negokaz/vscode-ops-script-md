import OpsView from "./opsView";
import * as vscode from "vscode";

export default class OpsViewManager {

    public static create(context: vscode.ExtensionContext): OpsViewManager {
        return new OpsViewManager(context);
    }

    private views: Map<string, OpsView> = new Map();

    private readonly context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public openView(viewColumn: vscode.ViewColumn): (uri?: vscode.Uri) => Promise<OpsView | null> {
        return async (uri?: vscode.Uri) => {
            let document: vscode.TextDocument;
            if (uri) {
                document = await vscode.workspace.openTextDocument(uri);
            } else if (vscode.window.activeTextEditor) {
                document = vscode.window.activeTextEditor.document;
            } else {
                const message = "Could not resolve document URI.";
                vscode.window.showErrorMessage(message);
                throw new Error(message);
            }

            if (document.languageId !== 'markdown') {
                // delegate to vscode to open the document if it isn't markdown
                vscode.commands.executeCommand('vscode.open', document.uri, viewColumn);
                return null;
            }

            const key = document.uri.fsPath;
            let opsView: OpsView | undefined = this.views.get(key);

            if (opsView) {
                opsView.show(viewColumn);
            } else {
                opsView = await OpsView.open(this.context, viewColumn, document);
                this.views.set(key, opsView);
                opsView.onDidClose(() => {
                    this.views.delete(key);
                });
            }
            return opsView;
        };
    }
}
