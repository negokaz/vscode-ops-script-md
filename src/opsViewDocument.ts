import * as vscode from 'vscode';
import * as path from 'path';

import Config from './config/config';
import MarkdownEngine from './markdown/markdownEngine';
import { StdoutProduced, StderrProduced, ProcessCompleted, SpawnFailed, LogLoaded, ExecutionStarted } from './scriptChunk/processEvents';
import ScriptChunkManager from './scriptChunk/scriptChunkManager';
import { TriggeredReload, ChangedDocument } from './opsViewEvents';
import * as iconv from 'iconv-lite';
import OpsViewEventBus from './opsViewEventBus';
import CarriageReturnRemover from './util/carriageReturnRemover';

const barbe = require('barbe');

export default class OpsViewDocument {

    static async render(context: vscode.ExtensionContext, config: Config, eventBus: OpsViewEventBus, document: vscode.TextDocument, panel: vscode.WebviewPanel): Promise<OpsViewDocument> {
        const mdEngine = new MarkdownEngine(config);
        const result = await mdEngine.render(OpsViewDocument.getDocuemntText(document, config), document.uri, config);
        let opsViewDocument: OpsViewDocument = new OpsViewDocument(context, eventBus, document, config, panel, result.html, result.scriptChunkManager);
        context.subscriptions.push(opsViewDocument);
        return opsViewDocument;
    }

    private static getDocuemntText(document: vscode.TextDocument, config: Config): string {
        return barbe(document.getText(), ['{{', '}}'], config.variables);
    }

    readonly panel: vscode.WebviewPanel;

    readonly document: vscode.TextDocument;

    readonly scriptChunkManager: ScriptChunkManager;

    readonly config: Config;

    private readonly context: vscode.ExtensionContext;

    private readonly eventBus: OpsViewEventBus;
    
    private disposables: vscode.Disposable[] = [];

    private constructor (context: vscode.ExtensionContext, eventBus: OpsViewEventBus, document: vscode.TextDocument, config: Config, panel: vscode.WebviewPanel, content: string, scriptChunkManager: ScriptChunkManager) {
        this.context = context;
        this.eventBus = eventBus;
        this.panel = panel;
        this.document = document;
        this.config = config;

        this.scriptChunkManager = scriptChunkManager;
        this.panel.webview.html = ''; // html に差が無い場合、WebView の内容が更新されないため
        this.panel.webview.html = this.webviewContent(content);
        this.disposables.push(this.panel.webview.onDidReceiveMessage(m => this.receiveOpsViewMessage(m), context.subscriptions));
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(e => this.notifyDocuemntChange(e), this.context.subscriptions));
        this.disposables.push(this.panel.onDidChangeViewState(e => this.changeViewState(e), this.context.subscriptions));
    }

    private webviewContent(content: string): string {
        return `<!DOCTYPE html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${this.resourceUri('media', 'css', 'icofont.min.css')}">
        <link rel="stylesheet" href="${this.resourceUri('media', 'css', 'spinner.css')}">
        <link rel="stylesheet" href="${this.resourceUri('media', 'css', 'markdown.css')}">
        <link rel="stylesheet" href="${this.resourceUri('media', 'css', 'markdown-ext.css')}">
        <link rel="stylesheet" href="${this.resourceUri('media', 'css', 'ops-view.css')}">
        <link rel="stylesheet" href="${this.resourceUri('media', 'css', 'highlight.css')}">
        <script src="${this.resourceUri('dist', 'opsView.js')}"></script>
    </head>
    <body>
        <div class="reload-notification hover">
            <a class="reload-trigger" title="更新">ドキュメントが更新されました。クリックでリロード</a>
        </div>
        ${content}
    </body>
    </html>
    `;
    }
    
    private resourceUri(...pathElements: string[]): vscode.Uri {
        const onDiskPath = vscode.Uri.file(
            path.join(this.context.extensionPath, path.join(...pathElements))
        );
        return onDiskPath.with({ scheme: 'vscode-resource' });
    }

    private receiveOpsViewMessage(message: any) {
        switch (message.command) {
            case 'executeScriptChunk':
                this.executeScriptChunk(message.scriptChunkId);
                return;
            case 'killScriptChunk':
                this.killScriptChunk(message.scriptChunkId);
                return;
            case 'reloadDocument':
                this.reloadDocument();
                return;
        }
    }

    private executeScriptChunk(scriptChunkId: string) {
        const scriptChunk = this.scriptChunkManager.getScriptChunk(scriptChunkId);
        this.eventBus.publish(ExecutionStarted.topic, new ExecutionStarted(scriptChunkId, new Date()));
        try {
            const proc = scriptChunk.spawnProcess(this.config.documentDirectory);
            if (proc.stdout) {
                proc.stdout
                    .pipe(iconv.decodeStream(scriptChunk.encoding))
                    .pipe(CarriageReturnRemover.transformStream())
                    .on('data', data => {
                        this.eventBus.publish(StdoutProduced.topic, new StdoutProduced(scriptChunkId, data));
                    });
            }
            if (proc.stderr) {
                proc.stderr
                    .pipe(iconv.decodeStream(scriptChunk.encoding))
                    .pipe(CarriageReturnRemover.transformStream())
                    .on('data', data => {
                        this.eventBus.publish(StderrProduced.topic, new StderrProduced(scriptChunkId, data));
                    });
            }
            proc.on('close', code => {
                this.eventBus.publish(ProcessCompleted.topic, new ProcessCompleted(scriptChunkId, code, new Date()));
            });
            proc.on('error', err => {
                this.eventBus.publish(SpawnFailed.topic, new SpawnFailed(scriptChunkId, err));
            });
        } catch (err) {
            this.eventBus.publish(SpawnFailed.topic, new SpawnFailed(scriptChunkId, err));
            this.eventBus.publish(ProcessCompleted.topic, new ProcessCompleted(scriptChunkId, -1, new Date()));
        }
    }

    private killScriptChunk(scriptChunkId: string) {
        const scriptChunk = this.scriptChunkManager.getScriptChunk(scriptChunkId);
        scriptChunk.killProcess();
    }

    private reloadDocument() {
        this.eventBus.publish(TriggeredReload.topic, new TriggeredReload());
    }

    private readonly changeNotificationDelayMs = 300;

    private changeNotificationTimer: NodeJS.Timeout | null = null;

    private notifyDocuemntChange(e: vscode.TextDocumentChangeEvent) {
        if (this.changeNotificationTimer) {
            clearTimeout(this.changeNotificationTimer);
        }
        const changedPath = e.document.uri.fsPath;
        if (changedPath === this.document.uri.fsPath 
            || this.config.configDocuments.filter(d => changedPath === d.uri.fsPath).length > 0) {
            
            this.changeNotificationTimer = setTimeout(() => {
                this.eventBus.publish(ChangedDocument.topic, new ChangedDocument());
            }, this.changeNotificationDelayMs);
        }
    }

    private stashedMessages: any[] = [];

    private unstashMessages() {
        // enqueue messages if it exist
        if (this.stashedMessages.length > 0) {
            this.stashedMessages.forEach(m => {
                this.panel.webview.postMessage(m);
            });
            this.stashedMessages = [];
        }
    }

    public postMessage(message: any) {
        if (this.panel.visible) {
            this.unstashMessages();
            this.panel.webview.postMessage(message).then(success => {
                if (!success) {
                    // retry postMessage when failed
                    this.stashedMessages.push(message);
                }
            });
        } else {
            this.stashedMessages.push(message);
        }
    }

    private changeViewState(e: vscode.WebviewPanelOnDidChangeViewStateEvent) {
        if (e.webviewPanel.active) {
            this.unstashMessages();
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.scriptChunkManager.killAllRunningScriptChunk();
    }
}
