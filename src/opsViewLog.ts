import * as vscode from 'vscode';
import * as yaml from 'yaml';
import * as path from 'path';
import * as fs from 'fs';

import LogEntry from './log/LogEntry';
import { StdoutProduced, StderrProduced, ProcessCompleted, SpawnFailed, LogLoaded as LogLoaded, ExecutionStarted } from './scriptChunk/processEvents';
import ScriptChunkManager from './scriptChunk/scriptChunkManager';
import OpsViewEventBus from './opsViewEventBus';
import Config from './config/config';

const { strOptions } = require('yaml/types');
strOptions.fold.lineWidth = Number.MAX_VALUE; // avoid to wrap logs

export default class OpsViewLog {

    static async active(context: vscode.ExtensionContext, config: Config, eventBus: OpsViewEventBus, document: vscode.TextDocument, scriptChunkManager: ScriptChunkManager): Promise<OpsViewLog> {

        const logDir = await OpsViewLog.createLogDirectoryIfNotExists(config.baseDirectory, config.documentDirectory);
        const logFilename = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath)) + '.log.yml';
        const logPath = vscode.Uri.file(path.join(logDir.fsPath, logFilename));

        const opsViewLog = new OpsViewLog(eventBus, scriptChunkManager, logPath);
        opsViewLog.subscribeEvents();
        opsViewLog.publishLog();
        context.subscriptions.push(opsViewLog);
        return opsViewLog;
    }

    private static async createLogDirectoryIfNotExists(baseDirectory: vscode.Uri, documentDirectory: vscode.Uri): Promise<vscode.Uri> {
        const documentRelativePath = documentDirectory.fsPath.substr(baseDirectory.fsPath.length);
        const logDir = path.join(baseDirectory.fsPath, 'logs', documentRelativePath);
        console.log(logDir);
        await fs.promises.mkdir(logDir, { recursive: true });
        return vscode.Uri.file(logDir);
    }

    private readonly eventBus: OpsViewEventBus;

    private readonly scriptChunkManager: ScriptChunkManager;

    private readonly logPath: vscode.Uri;

    private readonly logs: Map<string, LogEntry> = new Map();

    private constructor(eventBus: OpsViewEventBus, scriptChunkManager: ScriptChunkManager, logPath: vscode.Uri) {
        this.eventBus = eventBus;
        this.scriptChunkManager = scriptChunkManager;
        this.logPath = logPath;
    }

    get logPathString(): string {
        return this.logPath.fsPath;
    }

    private readLog(): any {
        return yaml.parse(fs.readFileSync(this.logPathString, 'utf8'));
    }

    private writeLog(): void {
        fs.writeFileSync(this.logPathString, yaml.stringify(this.logs));
    }

    private publishLog() {
        if (fs.existsSync(this.logPathString)) {
            const logs: any = this.readLog();
            for (let id in logs) {
                if (this.scriptChunkManager.hasScriptChunk(id)) {
                    const log = logs[id];
                    this.eventBus.publish(LogLoaded.topic, new LogLoaded(id, log.command, log.script, log.start, log.end, log.output, log.exitCode));
                }
            }
        }
    }

    private getLog(scriptChunkId: string): LogEntry {
        const maybeLog: LogEntry | undefined = this.logs.get(scriptChunkId);
        const log: LogEntry = maybeLog ? maybeLog : new LogEntry();
        this.logs.set(scriptChunkId, log);
        return log;
    }

    private subscribeEvents() {
    
        this.eventBus.subscribe(ExecutionStarted.topic, (event: ExecutionStarted) => {
            const log = this.getLog(event.scriptChunkId);
            const scriptChunk = this.scriptChunkManager.getScriptChunk(event.scriptChunkId);
            log.command = scriptChunk.commandLine;
            log.script = scriptChunk.script;
            log.output = '';
            log.start = event.startTime.toLocaleString();
        });
        this.eventBus.subscribe(StdoutProduced.topic, (event: StdoutProduced) => {
            const log = this.getLog(event.scriptChunkId);
            log.output = log.output + event.data;
        });
        this.eventBus.subscribe(StderrProduced.topic, (event: StderrProduced) => {
            const log = this.getLog(event.scriptChunkId);
            log.output = log.output + event.data;
        });
        this.eventBus.subscribe(ProcessCompleted.topic, (event: ProcessCompleted) => {
            const log = this.getLog(event.scriptChunkId);
            log.end = event.endTime.toLocaleString();
            log.exitCode = event.exitCode;
            this.writeLog();
        });
        this.eventBus.subscribe(SpawnFailed.topic, (event: SpawnFailed) => {
            const log = this.getLog(event.scriptChunkId);
            log.output = log.output + event.cause.name + '\n' + event.cause.message;
        });
        this.eventBus.subscribe(LogLoaded.topic, (event: LogLoaded) => {
            const log = this.getLog(event.scriptChunkId);
            log.command = event.command;
            log.script = event.script;
            log.start = event.start;
            log.end = event.end;
            log.output = event.output;
            log.exitCode = event.exitCode;
        });
    }

    public dispose(): void {
        this.writeLog();
    }
}