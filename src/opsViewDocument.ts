import * as vscode from 'vscode';
import * as path from 'path';
import * as PubSub from 'pubsub-js';

import Config from './config/config';
import MarkdownEngine from './markdown/markdownEngine';
import { StdoutProduced, StderrProduced, ProcessCompleted, SpawnFailed, LogLoaded, ExecutionStarted } from './scriptChunk/processEvents';
import ScriptChunkManager from './scriptChunk/scriptChunkManager';
import { TriggeredReload, ChangedDocument } from './opsViewEvents';

const iconv = require('iconv-jschardet');
const barbe = require('barbe');

export default class OpsViewDocument {

    static render(context: vscode.ExtensionContext, document: vscode.TextDocument, panel: vscode.WebviewPanel): OpsViewDocument {
        const opsViewDocument = new OpsViewDocument(context, document, panel);
        context.subscriptions.push(opsViewDocument);
        return opsViewDocument;
    }

    readonly panel: vscode.WebviewPanel;

    readonly document: vscode.TextDocument;

    readonly scriptChunkManager: ScriptChunkManager;

    private readonly context: vscode.ExtensionContext;

    private readonly workspace: vscode.WorkspaceFolder | null;

    private readonly mdEngine = new MarkdownEngine();

    private disposables: vscode.Disposable[] = [];

    get workingDirectory(): vscode.Uri {
        return vscode.Uri.file(path.dirname(this.document.uri.fsPath));
    }

    private constructor (context: vscode.ExtensionContext, document: vscode.TextDocument, panel: vscode.WebviewPanel) {
        this.context = context;
        this.panel = panel;
        this.document = document;

        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            this.workspace = vscode.workspace.workspaceFolders[0];
        } else {
            this.workspace = null;
        }

        const [content, manager] = this.mdEngine.render(this.getDocuemntText());
        this.panel.title = `OpsView: ${path.basename(this.document.uri.fsPath)}`;
        this.panel.webview.html = ''; // html に差が無い場合、WebView の内容が更新されないため
        this.panel.webview.html = this.webviewContent(content);
        this.disposables.push(this.panel.webview.onDidReceiveMessage(m => this.receiveOpsViewMessage(m), context.subscriptions));
        this.scriptChunkManager = manager;
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(e => this.notifyDocuemntChange(e), this.context.subscriptions));
        this.disposables.push(this.panel.onDidChangeViewState(e => this.changeViewState(e), this.context.subscriptions));
    }

    private getDocuemntText(): string {
        if (this.workspace) {
            const config = Config.load(this.workspace.uri);
            return barbe(this.document.getText(), ['{{', '}}'], config.variables);
        } else {
            return this.document.getText();
        }
    }

    private webviewContent(content: string): string {
        return `<!DOCTYPE html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${this.resourceUri('css', 'icofont.min.css')}">
        <link rel="stylesheet" href="${this.resourceUri('css', 'spinner.css')}">
        <link rel="stylesheet" href="${this.resourceUri('css', 'markdown.css')}">
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
        PubSub.publish(ExecutionStarted.topic, new ExecutionStarted(scriptChunkId, new Date()));
        const proc = scriptChunk.spawnProcess(this.workingDirectory);
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
    }

    private killScriptChunk(scriptChunkId: string) {
        const scriptChunk = this.scriptChunkManager.getScriptChunk(scriptChunkId);
        scriptChunk.killProcess();
    }

    private reloadDocument() {
        PubSub.publish(TriggeredReload.topic, new TriggeredReload());
    }

    private readonly changeNotificationDelayMs = 300;

    private changeNotificationTimer: NodeJS.Timeout | null = null;

    private notifyDocuemntChange(e: vscode.TextDocumentChangeEvent) {
        if (this.changeNotificationTimer) {
            clearTimeout(this.changeNotificationTimer);
        }
        if (e.document.uri.fsPath === this.document.uri.fsPath) {
            this.changeNotificationTimer = setTimeout(() => {
                PubSub.publish(ChangedDocument.topic, new ChangedDocument());
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
        if (this.panel.active) {
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