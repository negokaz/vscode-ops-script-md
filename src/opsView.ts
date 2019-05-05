import * as vscode from 'vscode';
import * as path from 'path';
import * as iconv from 'iconv-jschardet';
import MarkdownEngine from './markdown/markdownEngine';
import * as PubSub from 'pubsub-js';
import { StdoutProduced, StderrProduced, ProcessCompleted, SpawnFailed, LogLoaded as LogLoaded, ExecutionStarted } from './scriptChunk/processEvents';
import ScriptChunkManager from './scriptChunk/scriptChunkManager';
import * as yaml from 'yaml';
import * as fs from 'fs';
import Config from './config/config';
import LogEntry from './log/LogEntry';

const barbe = require('barbe');

const resourceDirectoryName = 'media';

export default function openOpsView(context: vscode.ExtensionContext, viewColumn: vscode.ViewColumn) {
    iconv.disableCodecDataWarn();
    return () => {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showErrorMessage("None active text editor.");
            return;
        }

        let workspace: vscode.Uri | null = null;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            workspace = vscode.workspace.workspaceFolders[0].uri;
        }

        const resource = vscode.window.activeTextEditor.document;

        const panel = vscode.window.createWebviewPanel(
            'OpsView',
            'OpsView: ' + path.basename(resource.uri.path),
            viewColumn,
            {
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, resourceDirectoryName))],
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );
        subscribeEvents(panel.webview);
        const md = new MarkdownEngine();
        let resourceText: string = '';
        if (workspace) {
            const config = Config.load(workspace);
            resourceText = barbe(resource.getText(), ['{{', '}}'], config.variables);
        } else {
            resourceText = resource.getText();
        }
        const [content, manager] = md.render(resourceText);
        panel.webview.html = webviewContent(content, context);
        panel.webview.onDidReceiveMessage(
            message => {
                const scriptChunkId = message.scriptChunkId;
                const scriptChunk = manager.getScriptChunk(scriptChunkId);
                switch (message.command) {
                    case 'executeScriptChunk':
                        PubSub.publish(ExecutionStarted.topic, new ExecutionStarted(scriptChunkId, new Date()));
                        const proc = scriptChunk.spawnProcess();
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
                        return;
                    case 'killScriptChunk':
                        scriptChunk.killProcess();
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const logDir = path.join(rootPath, 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir);
            }
            const logFilename = path.basename(resource.uri.fsPath, path.extname(resource.uri.fsPath)) + '.log.yml';
            publishLog(manager, path.join(logDir, logFilename));
            subscribeToPersistEvents(manager, path.join(logDir, logFilename));
        }
    };
}

function webviewContent(content: string, context: vscode.ExtensionContext): string {
    return `<!DOCTYPE html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${resourceUri(context, 'css', 'icofont.min.css')}">
    <link rel="stylesheet" href="${resourceUri(context, 'css', 'spinner.css')}">
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

function subscribeEvents(webview: vscode.Webview) {
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

function publishLog(manager: ScriptChunkManager, logPath: string) {
    if (fs.existsSync(logPath)) {
        const logs: any = yaml.parse(fs.readFileSync(logPath, 'utf8'));
        for (let id in logs) {
            if (manager.hasScriptChunk(id)) {
                const log = logs[id];
                PubSub.publish(LogLoaded.topic, new LogLoaded(id, log.command, log.script, log.start, log.end, log.output, log.exitCode));
            }
        }
    }
}

function subscribeToPersistEvents(manager: ScriptChunkManager, logPath: string) {
    const logs: Map<string, LogEntry> = new Map();
    
    function getLog(scriptChunkId: string) {
        const maybeLog: LogEntry | undefined = logs.get(scriptChunkId);
        const log: LogEntry = maybeLog ? maybeLog : new LogEntry(scriptChunkId);
        logs.set(scriptChunkId, log);
        return log;
    }

    PubSub.subscribe(ExecutionStarted.topic, (_: any, event: ExecutionStarted) => {
        const log = getLog(event.scriptChunkId);
        const scriptChunk = manager.getScriptChunk(event.scriptChunkId);
        log.command = scriptChunk.commandLine;
        log.script = scriptChunk.script;
        log.output = '';
        log.start = event.startTime.toLocaleString();
    });
    PubSub.subscribe(StdoutProduced.topic, (_: any, event: StdoutProduced) => {
        const log = getLog(event.scriptChunkId);
        log.output = log.output + event.data;
    });
    PubSub.subscribe(StderrProduced.topic, (_: any, event: StderrProduced) => {
        const log = getLog(event.scriptChunkId);
        log.output = log.output + event.data;
    });
    PubSub.subscribe(ProcessCompleted.topic, (_: any, event: ProcessCompleted) => {
        const log = getLog(event.scriptChunkId);
        log.end = event.endTime.toLocaleString();
        log.exitCode = event.exitCode;
        fs.writeFileSync(logPath, yaml.stringify(logs));
    });
    PubSub.subscribe(SpawnFailed.topic, (_: any, event: SpawnFailed) => {
        const log = getLog(event.scriptChunkId);
        log.output = log.output + event.cause.name + event.cause.message;
    });
    PubSub.subscribe(LogLoaded.topic, (_: any, event: LogLoaded) => {
        const log = getLog(event.scriptChunkId);
        log.command = event.command;
        log.script = event.script;
        log.start = event.start;
        log.end = event.end;
        log.output = event.output;
        log.exitCode = event.exitCode;
    });
}