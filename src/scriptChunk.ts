import * as RJSON from 'relaxed-json';
import { Token } from 'markdown-it';

export default class ScriptChunk {

    static parse(token: Token): ScriptChunk {
        const maybeSettings = /{.+}/.exec(token.info);
        if (maybeSettings && maybeSettings.length > 0 ) {
            const settings: any = RJSON.parse(maybeSettings[0]);
            if (settings.cmd) {
                const args = settings.args ? settings.args : [];
                return new ScriptChunk(token.content, settings.cmd, args);
            }
        }
        return new InvalidScriptChunk();
    }

    public readonly script: string;

    public readonly cmd: string;
    
    public readonly args: string[];

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
}

export class InvalidScriptChunk extends ScriptChunk {

    constructor() {
        super('', '', []);
    }

    public get isRunnable(): boolean {
        return false;
    }
}