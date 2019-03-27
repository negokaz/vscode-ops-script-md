import * as RJSON from 'relaxed-json';
import { Token } from 'markdown-it';
import { ChildProcess } from 'child_process';
import * as childProcess from 'child_process';
import * as os from 'os';

export default class ScriptChunk {

    static parse(token: Token): ScriptChunk {
        const maybeSettings = /{.+}/.exec(token.info);
        if (maybeSettings && maybeSettings.length > 0 ) {
            const settings: any = RJSON.parse(maybeSettings[0]);
            if (Array.isArray(settings.cmd) && settings.cmd.length > 0) {
                return new ScriptChunk(token.content, settings.cmd[0], settings.cmd.slice(1));
            }
        }
        return new InvalidScriptChunk();
    }

    public readonly script: string;

    public readonly cmd: string;
    
    public readonly args: string[];

    process: ChildProcess | undefined = undefined;

    constructor(script: string, cmd: string, args: string[]) {
        this.script = script;
        this.cmd = cmd;
        this.args = args;
    }

    public get isRunnable(): boolean {
        return true;
    }

    public get commandLine(): string {
        return `${this.cmd}${this.args.length > 0 ? ' ' + this.args.join(' ') : ''}`;
    }

    public spawnProcess(): ChildProcess {
        const process = childProcess.spawn(this.cmd, this.args.concat(this.script));
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
                    childProcess.spawn("taskkill", ["/pid", process.pid.toString(), '/t', '/f']);
                    return;
                default:
                    this.process.kill('SIGINT');
                    return;
            }
        }
    }
}

export class InvalidScriptChunk extends ScriptChunk {

    constructor() {
        super('', '', []);
    }

    public get isRunnable(): boolean {
        return false;
    }
}