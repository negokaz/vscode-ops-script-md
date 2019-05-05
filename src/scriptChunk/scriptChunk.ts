import * as RJSON from 'relaxed-json';
import { Token } from 'markdown-it';
import { ChildProcess } from 'child_process';
import * as childProcess from 'child_process';
import * as os from 'os';
import * as nodeProcess from 'process';
import { Uri } from 'vscode';

export default class ScriptChunk {

    static parse(token: Token): ScriptChunk {
        const maybeSettings = /{.+}/.exec(token.info);
        if (maybeSettings && maybeSettings.length > 0 ) {
            const settings: any = RJSON.parse(maybeSettings[0]);
            if (Array.isArray(settings.cmd) && settings.cmd.length > 0) {
                const stdin = settings.stdin ? true : false;
                return new ScriptChunk(token.content, settings.cmd[0], settings.cmd.slice(1), stdin);
            }
        }
        return new InvalidScriptChunk();
    }

    public readonly script: string;

    public readonly cmd: string;
    
    public readonly args: string[];

    public readonly stdin: boolean;

    process: ChildProcess | undefined = undefined;

    constructor(script: string, cmd: string, args: string[], stdin: boolean) {
        this.script = script;
        this.cmd = cmd;
        this.args = args;
        this.stdin = stdin;
    }

    public get isRunnable(): boolean {
        return true;
    }

    public get commandLine(): string {
        const header = this.stdin ? '[stdin] ' : '';
        return `${header}${this.cmd}${this.args.length > 0 ? ' ' + this.args.join(' ') : ''}`;
    }

    public spawnProcess(workingDir: Uri): ChildProcess {
        let process = null;
        if (this.stdin) {
            process = childProcess.spawn(this.cmd, this.args, {detached: true, cwd: workingDir.fsPath});
            process.stdin.write(this.script);
            process.stdin.end();
        } else {
            process = childProcess.spawn(this.cmd, this.args.concat(this.script), {detached: true, cwd: workingDir.fsPath});
        }
        process.on('close', () => {
            this.process = undefined;
        });
        this.process = process;
        return process;
    }

    public killProcess() {
        if (this.process) {
            switch (os.platform()) {
                case 'win32':
                    childProcess.spawn("taskkill", ["/pid", this.process.pid.toString(), '/t', '/f']);
                    return;
                default:
                    // > Please note `-` before pid. This converts a pid to a group of pids for process kill() method.
                    // https://azimi.me/2014/12/31/kill-child_process-node-js.html#pid-range-hack
                    nodeProcess.kill(-this.process.pid, 'SIGINT');
                    return;
            }
        }
    }
}

export class InvalidScriptChunk extends ScriptChunk {

    constructor() {
        super('', '', [], false);
    }

    public get isRunnable(): boolean {
        return false;
    }
}