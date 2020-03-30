import * as RJSON from 'relaxed-json';
import Token from 'markdown-it/lib/token';
import { ChildProcess } from 'child_process';
import * as childProcess from 'child_process';
import * as os from 'os';
import * as nodeProcess from 'process';
import { Uri } from 'vscode';
import * as iconv from 'iconv-lite';
import Config from '../config/config';
import which from 'which';

export default class ScriptChunk {

    static async parse(token: Token, config: Config): Promise<ScriptChunk> {
        try {
            const maybeSettings = /{.+}/.exec(token.info);
            if (maybeSettings && maybeSettings.length > 0 ) {
                const settings: any = RJSON.parse(maybeSettings[0]);
                if (Array.isArray(settings.cmd) && settings.cmd.length > 0) {
                    const displayCmd = settings.cmd[0];
                    const cmd = await (which(displayCmd, { path: config.env.PATH }).catch(_ => displayCmd));
                    const stdin = settings.stdin ? true : false;
                    const encoding =
                        settings.encoding && iconv.encodingExists(settings.encoding) 
                            ? settings.encoding 
                            : ScriptChunk.defaultEncoding;
                    return new ScriptChunk(token.content, displayCmd, cmd, settings.cmd.slice(1), stdin, encoding, config.env);
                }
            }
        } catch (e) {
            return new InvalidScriptChunk(e);
        }
        return new DisabledScriptChunk();
    }

    public static readonly defaultEncoding = 'utf-8';

    public readonly script: string;

    public readonly displayCmd: string;

    public readonly cmd: string;
    
    public readonly args: string[];

    public readonly stdin: boolean;

    public readonly encoding: string;

    public readonly env: any;

    process: ChildProcess | undefined = undefined;

    triedToKillBySignal: boolean = false;

    constructor(script: string, displayCmd: string, cmd: string, args: string[], stdin: boolean, encoding: string, env: any) {
        this.script = script;
        this.displayCmd = displayCmd;
        this.cmd = cmd;
        this.args = args;
        this.stdin = stdin;
        this.encoding = encoding;
        this.env = env;
    }

    public get isEnable(): boolean {
        return true;
    }

    public get error(): Error | undefined {
        return undefined;
    }

    public get isRunning(): boolean {
        return this.process !== undefined;
    }

    public get commandLine(): string {
        const header = this.stdin ? '[stdin] ' : '';
        function quoteIfContainsSpace(str: string): string {
            const trimed = str.trim();
            if (trimed.indexOf(' ') > 0 || trimed.indexOf('\t') > 0) {
                // arg contains space
                return `"${str}"`;
            } else {
                return str;
            }
        }
        return `${header}${quoteIfContainsSpace(this.displayCmd)}${this.args.length > 0 ? ' ' + this.args.map(quoteIfContainsSpace).join(' ') : ''}`;
    }

    public spawnProcess(workingDir: Uri): ChildProcess {
        let process = null;
        let detachProcess = os.platform() !== 'win32';
        if (this.stdin) {
            process = childProcess.spawn(
                this.convertEncoding(this.cmd),
                this.args.map(a => this.convertEncoding(a)),
                {
                    detached: detachProcess,
                    cwd: workingDir.fsPath,
                    env: this.env
                }
            );
            process.stdin.write(this.convertEncoding(this.script));
            process.stdin.end();
        } else {
            process = childProcess.spawn(
                this.convertEncoding(this.cmd),
                this.args.concat(this.script).map(a => this.convertEncoding(a)),
                {
                    detached: detachProcess,
                    cwd: workingDir.fsPath,
                    env: this.env,
                    stdio: ['ignore', 'pipe', 'pipe']
                }
            );
        }
        process.on('close', () => {
            this.process = undefined;
        });
        this.process = process;
        this.triedToKillBySignal = false;
        return process;
    }

    public killProcess() {
        if (this.process) {
            if (this.triedToKillBySignal) {
                // force kill
                switch (os.platform()) {
                    case 'win32':
                        childProcess.spawn("taskkill", ["/pid", this.process.pid.toString(), '/t', '/f']);
                        return;
                    default:
                        // > Please note `-` before pid. This converts a pid to a group of pids for process kill() method.
                        // https://azimi.me/2014/12/31/kill-child_process-node-js.html#pid-range-hack
                        nodeProcess.kill(-this.process.pid, 'SIGKILL');
                        return;
                }
            } else {
                // kill by signal
                this.triedToKillBySignal = true;
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

    private convertEncoding(code: string): string {
        return iconv.decode(iconv.encode(code, this.encoding), this.encoding);
    }
}

export class DisabledScriptChunk extends ScriptChunk {

    constructor() {
        super('', '', '', [], false, ScriptChunk.defaultEncoding, {});
    }

    public get isEnable(): boolean {
        return false;
    }
}

export class InvalidScriptChunk extends ScriptChunk {

    public readonly _error: Error;

    constructor(error: Error) {
        super('', '', '', [], false, ScriptChunk.defaultEncoding, {});
        this._error = error;
    }

    public get error(): Error | undefined {
        return this._error;
    }
}
