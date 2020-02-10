import * as vscode from 'vscode';
import * as path from 'path';

import Config from './config/config';
import MarkdownEngine from './markdown/markdownEngine';
import { StdoutProduced, StderrProduced, ProcessCompleted, SpawnFailed, LogLoaded, ExecutionStarted } from './scriptChunk/processEvents';
import ScriptChunkManager from './scriptChunk/scriptChunkManager';
import { TriggeredReload, ChangedDocument } from './opsViewEvents';
import * as iconv from 'iconv-lite';
import OpsViewEventBus from './opsViewEventBus';

const barbe = require('barbe');

export default class OpsViewDocument {

    static async render(context: vscode.ExtensionContext, eventBus: OpsViewEventBus, document: vscode.TextDocument, panel: vscode.WebviewPanel): Promise<OpsViewDocument> {

        let opsViewDocument: OpsViewDocument;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspace = vscode.workspace.workspaceFolders[0];
            const [config, configDocs] = await Config.load(workspace.uri);
            opsViewDocument = new OpsViewDocument(context, eventBus, document, config, configDocs, panel);
        } else {
            opsViewDocument = new OpsViewDocument(context, eventBus, document, Config.default(), [], panel);
        }
        context.subscriptions.push(opsViewDocument);
        return opsViewDocument;
    }

    readonly panel: vscode.WebviewPanel;

    readonly document: vscode.TextDocument;

    readonly scriptChunkManager: ScriptChunkManager;

    readonly config: Config;

    readonly configDocuments: vscode.TextDocument[];

    private readonly context: vscode.ExtensionContext;

    private readonly eventBus: OpsViewEventBus;

    private readonly mdEngine: MarkdownEngine;

    private disposables: vscode.Disposable[] = [];

    get workingDirectory(): vscode.Uri {
        return vscode.Uri.file(path.dirname(this.document.uri.fsPath));
    }

    private constructor (context: vscode.ExtensionContext, eventBus: OpsViewEventBus, document: vscode.TextDocument, config: Config, configDocuments: vscode.TextDocument[], panel: vscode.WebviewPanel) {
        this.context = context;
        this.eventBus = eventBus;
        this.panel = panel;
        this.document = document;
        this.config = config;
        this.configDocuments = configDocuments;

        this.mdEngine = new MarkdownEngine(this.config);

        const [content, manager] = this.mdEngine.render(this.getDocuemntText(), document.uri, this.config);
        this.scriptChunkManager = manager;
        this.panel.title = `OpsView: ${path.basename(this.document.uri.fsPath)}`;
        this.panel.webview.html = ''; // html に差が無い場合、WebView の内容が更新されないため
        this.panel.webview.html = this.webviewContent(content);
        this.disposables.push(this.panel.webview.onDidReceiveMessage(m => this.receiveOpsViewMessage(m), context.subscriptions));
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(e => this.notifyDocuemntChange(e), this.context.subscriptions));
        this.disposables.push(this.panel.onDidChangeViewState(e => this.changeViewState(e), this.context.subscriptions));
    }

    private getDocuemntText(): string {
        return barbe(this.document.getText(), ['{{', '}}'], this.config.variables);
    }

    private webviewContent(content: string): string {
        return `<!DOCTYPE html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${this.resourceUri('css', 'icofont.min.css')}">
        <link rel="stylesheet" href="${this.resourceUri('css', 'spinner.css')}">
        <link rel="stylesheet" href="${this.resourceUri('css', 'markdown.css')}">
        <link rel="stylesheet" href="${this.resourceUri('css', 'markdown-ext.css')}">
        <link rel="stylesheet" href="${this.resourceUri('css', 'ops-view.css')}">
        <link rel="stylesheet" href="${this.resourceUri('css', 'highlight.css')}">
        <script src="${this.resourceUri('js', 'ops-view.js')}"></script>
    </head>
    <body>
        <div class="reload-notification"></div>
        <div class="reload-notification hover">
            <a class="reload-trigger" title="更新">ドキュメントが更新されました。クリックでリロード</a>
        </div>
        ${content}
    </body>
    </html>
    `;
    }
    
    private resourceUri(...pathElements: string[]): vscode.Uri {
        const resourceDirectoryName = 'media';
        const onDiskPath = vscode.Uri.file(
            path.join(this.context.extensionPath, resourceDirectoryName, path.join(...pathElements))
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
            const proc = scriptChunk.spawnProcess(this.workingDirectory);
            if (proc.stdout) {
                proc.stdout
                    .pipe(iconv.decodeStream(scriptChunk.encoding))
                    .on('data', data => {
                        this.eventBus.publish(StdoutProduced.topic, new StdoutProduced(scriptChunkId, data));
                    });
            }
            if (proc.stderr) {
                proc.stderr
                    .pipe(iconv.decodeStream(scriptChunk.encoding))
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
            || this.configDocuments.filter(d => changedPath === d.uri.fsPath).length > 0) {
            
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