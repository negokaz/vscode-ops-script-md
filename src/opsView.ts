import * as vscode from 'vscode';
import * as path from 'path';
import * as PubSub from 'pubsub-js';
import * as fs from 'fs';

import OpsViewDocument from './opsViewDocument';
import OpsViewLog from './opsViewLog';
import { StdoutProduced, StderrProduced, ProcessCompleted, SpawnFailed, LogLoaded, ExecutionStarted } from './scriptChunk/processEvents';

const resourceDirectoryName = 'media';

export default class OpsView {

    static open(context: vscode.ExtensionContext, viewColumn: vscode.ViewColumn) {
        return () => {
            if (!vscode.window.activeTextEditor) {
                vscode.window.showErrorMessage("None active text editor.");
                return;
            }
            const panel = vscode.window.createWebviewPanel(
                'OpsView',
                'OpsView: ',
                viewColumn,
                {
                    localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, resourceDirectoryName))],
                    enableScripts: true,
                    retainContextWhenHidden: true,
                }
            );
            const opsView = new OpsView(context, panel);
            context.subscriptions.push(opsView);

            opsView.render(vscode.window.activeTextEditor.document);
        };
    }

    private readonly context: vscode.ExtensionContext;

    private readonly panel: vscode.WebviewPanel;

    private constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
        this.context = context;
        this.panel = panel;
    }

    public render(document: vscode.TextDocument) {
        PubSub.clearAllSubscriptions();
        this.subscribeEvents();

        const logDir = this.createLogDirectoryIfNotExists(document);
        const logFilename = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath)) + '.log.yml';
        const logPath = vscode.Uri.file(path.join(logDir.fsPath, logFilename));
        
        const opsViewDocuemnt = OpsViewDocument.render(this.context, document, this.panel);
        OpsViewLog.active(this.context, opsViewDocuemnt.scriptChunkManager, logPath);
    }

    private subscribeEvents() {
        const webview = this.panel.webview;
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
            webview.postMessage({ event: 'log', scriptChunkId: event.scriptChunkId, output: event.output, exitCode: event.exitCode });
        });
    }

    private createLogDirectoryIfNotExists(document: vscode.TextDocument): vscode.Uri {
        let rootUri: vscode.Uri;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            rootUri = vscode.workspace.workspaceFolders[0].uri;
        } else {
            rootUri = vscode.Uri.file(path.dirname(document.uri.fsPath));
        }
        const logDir = path.join(rootUri.fsPath, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }
        return vscode.Uri.file(logDir);
    }

    public dispose(): void {
        PubSub.clearAllSubscriptions();
    }
}