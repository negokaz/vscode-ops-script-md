import * as vscode from 'vscode';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as PubSub from 'pubsub-js';

import LogEntry from './log/LogEntry';
import { StdoutProduced, StderrProduced, ProcessCompleted, SpawnFailed, LogLoaded as LogLoaded, ExecutionStarted } from './scriptChunk/processEvents';
import ScriptChunkManager from './scriptChunk/scriptChunkManager';

const { strOptions } = require('yaml/types');
strOptions.fold.lineWidth = Number.MAX_VALUE; // avoid to wrap logs

export default class OpsViewLog {

    static active(context: vscode.ExtensionContext, scriptChunkManager: ScriptChunkManager, logPath: vscode.Uri): OpsViewLog {
        const opsViewLog = new OpsViewLog(scriptChunkManager, logPath);
        opsViewLog.subscribeEvents();
        opsViewLog.publishLog();
        context.subscriptions.push(opsViewLog);
        return opsViewLog;
    }

    private readonly scriptChunkManager: ScriptChunkManager;

    private readonly logPath: vscode.Uri;

    private readonly logs: Map<string, LogEntry> = new Map();

    private constructor(scriptChunkManager: ScriptChunkManager, logPath: vscode.Uri) {
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
                    PubSub.publish(LogLoaded.topic, new LogLoaded(id, log.command, log.script, log.start, log.end, log.output, log.exitCode));
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
    
        PubSub.subscribe(ExecutionStarted.topic, (_: any, event: ExecutionStarted) => {
            const log = this.getLog(event.scriptChunkId);
            const scriptChunk = this.scriptChunkManager.getScriptChunk(event.scriptChunkId);
            log.command = scriptChunk.commandLine;
            log.script = scriptChunk.script;
            log.output = '';
            log.start = event.startTime.toLocaleString();
        });
        PubSub.subscribe(StdoutProduced.topic, (_: any, event: StdoutProduced) => {
            const log = this.getLog(event.scriptChunkId);
            log.output = log.output + event.data;
        });
        PubSub.subscribe(StderrProduced.topic, (_: any, event: StderrProduced) => {
            const log = this.getLog(event.scriptChunkId);
            log.output = log.output + event.data;
        });
        PubSub.subscribe(ProcessCompleted.topic, (_: any, event: ProcessCompleted) => {
            const log = this.getLog(event.scriptChunkId);
            log.end = event.endTime.toLocaleString();
            log.exitCode = event.exitCode;
            this.writeLog();
        });
        PubSub.subscribe(SpawnFailed.topic, (_: any, event: SpawnFailed) => {
            const log = this.getLog(event.scriptChunkId);
            log.output = log.output + event.cause.name + event.cause.message;
        });
        PubSub.subscribe(LogLoaded.topic, (_: any, event: LogLoaded) => {
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