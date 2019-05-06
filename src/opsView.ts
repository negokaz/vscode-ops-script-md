import * as vscode from 'vscode';
import * as path from 'path';
import * as PubSub from 'pubsub-js';
import * as fs from 'fs';

import OpsViewDocument from './opsViewDocument';
import OpsViewLog from './opsViewLog';
import { StdoutProduced, StderrProduced, ProcessCompleted, SpawnFailed, LogLoaded, ExecutionStarted } from './scriptChunk/processEvents';
import { TriggeredReload, ChangedDocument } from './opsViewEvents';

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
            const opsView = new OpsView(context, panel, vscode.window.activeTextEditor.document);
            context.subscriptions.push(opsView);

            opsView.render();
        };
    }

    private readonly context: vscode.ExtensionContext;

    private readonly panel: vscode.WebviewPanel;

    private readonly document: vscode.TextDocument;

    private opsViewDocument: OpsViewDocument | null = null;

    private opsViewLog: OpsViewLog | null = null;

    private constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, document: vscode.TextDocument) {
        this.context = context;
        this.panel = panel;
        this.document = document;
    }

    public render() {
        PubSub.clearAllSubscriptions();
        if (this.opsViewDocument) {
            this.opsViewDocument.dispose();
        }
        if (this.opsViewLog) {
            this.opsViewLog.dispose();
        }

        this.subscribeEvents();

        const logDir = this.createLogDirectoryIfNotExists(this.document);
        const logFilename = path.basename(this.document.uri.fsPath, path.extname(this.document.uri.fsPath)) + '.log.yml';
        const logPath = vscode.Uri.file(path.join(logDir.fsPath, logFilename));
        
        const docuemnt = OpsViewDocument.render(this.context, this.document, this.panel);

        this.opsViewDocument = docuemnt;
        this.opsViewLog = OpsViewLog.active(this.context, docuemnt.scriptChunkManager, logPath);
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
        PubSub.subscribe(TriggeredReload.topic, (_: any, event: TriggeredReload) => {
            this.render();
        });
        PubSub.subscribe(ChangedDocument.topic, (_: any, event: ChangedDocument) => {
            webview.postMessage({ event: 'changedDocument' });
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