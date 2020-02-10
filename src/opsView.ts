import * as vscode from 'vscode';
import * as path from 'path';
import uuidv4 from 'uuid/v4';

import OpsViewDocument from './opsViewDocument';
import OpsViewLog from './opsViewLog';
import { StdoutProduced, StderrProduced, ProcessCompleted, SpawnFailed, LogLoaded, ExecutionStarted } from './scriptChunk/processEvents';
import { TriggeredReload, ChangedDocument } from './opsViewEvents';
import OpsViewEventBus from './opsViewEventBus';
import Config from './config/config';

export default class OpsView {

    static open(context: vscode.ExtensionContext, viewColumn: vscode.ViewColumn) {
        return async (uri?: vscode.Uri) => {

            let document: vscode.TextDocument;
            if (uri) {
                document = await vscode.workspace.openTextDocument(uri);
            } else if (vscode.window.activeTextEditor) {
                document = vscode.window.activeTextEditor.document;
            } else {
                vscode.window.showErrorMessage("Could not resolve document URI.");
                return;
            }
            const viewId = uuidv4();
            const panel = vscode.window.createWebviewPanel(
                'OpsView',
                `OpsView: ${path.basename(document.uri.fsPath)}`,
                viewColumn,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                }
            );
            const opsView = new OpsView(context, viewId, panel, document);
            context.subscriptions.push(opsView);
            opsView.render();
        };
    }

    private readonly context: vscode.ExtensionContext;

    private readonly eventBus: OpsViewEventBus;

    private readonly panel: vscode.WebviewPanel;

    private readonly document: vscode.TextDocument;

    private opsViewDocument: OpsViewDocument | null = null;

    private opsViewLog: OpsViewLog | null = null;

    private constructor(context: vscode.ExtensionContext, viewId: string, panel: vscode.WebviewPanel, document: vscode.TextDocument) {
        this.context = context;
        this.eventBus = OpsViewEventBus.for(viewId);
        this.panel = panel;
        this.document = document;
    }

    public async render(): Promise<void> {
        this.eventBus.unsbscribeAll();
        if (this.opsViewDocument) {
            this.opsViewDocument.dispose();
        }
        if (this.opsViewLog) {
            this.opsViewLog.dispose();
        }

        this.subscribeEvents();

        const config = await Config.load(this.document.uri);
        this.opsViewDocument = await OpsViewDocument.render(this.context, config, this.eventBus, this.document, this.panel);
        this.opsViewLog = await OpsViewLog.active(this.context, config, this.eventBus, this.document, this.opsViewDocument.scriptChunkManager);
    }

    private subscribeEvents() {
        this.eventBus.subscribe(StdoutProduced.topic, (event: StdoutProduced) => {
            if (this.opsViewDocument) {
                this.opsViewDocument.postMessage({ event: 'stdout', scriptChunkId: event.scriptChunkId, data: event.data });
            }
        });
        this.eventBus.subscribe(StderrProduced.topic, (event: StderrProduced) => {
            if (this.opsViewDocument) {
                this.opsViewDocument.postMessage({ event: 'stderr', scriptChunkId: event.scriptChunkId, data: event.data });
            }
        });
        this.eventBus.subscribe(ProcessCompleted.topic, (event: ProcessCompleted) => {
            if (this.opsViewDocument) {
                this.opsViewDocument.postMessage({ event: 'complete', scriptChunkId: event.scriptChunkId, code: event.exitCode });
            }
        });
        this.eventBus.subscribe(SpawnFailed.topic, (event: SpawnFailed) => {
            if (this.opsViewDocument) {
                this.opsViewDocument.postMessage({ event: 'error', scriptChunkId: event.scriptChunkId, name: event.cause.name, message: event.cause.message });
            }
        });
        this.eventBus.subscribe(LogLoaded.topic, (event: LogLoaded) => {
            if (this.opsViewDocument) {
                this.opsViewDocument.postMessage({ event: 'log', scriptChunkId: event.scriptChunkId, output: event.output, exitCode: event.exitCode });
            }
        });
        this.eventBus.subscribe(TriggeredReload.topic, (event: TriggeredReload) => {
            this.render();
        });
        this.eventBus.subscribe(ChangedDocument.topic, (event: ChangedDocument) => {
            if (this.opsViewDocument) {
                this.opsViewDocument.postMessage({ event: 'changedDocument' });
            }
        });
    }

    public dispose(): void {
        this.eventBus.unsbscribeAll();
    }
}