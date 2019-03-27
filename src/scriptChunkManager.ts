import * as uuidv4 from 'uuid/v4';
import { Token } from 'markdown-it';
import ScriptChunk from './scriptChunk';
import { ChildProcess } from 'child_process';
import * as childProcess from 'child_process';
import * as os from 'os';

export default class ScriptChunkManager {

    public static readonly SCRIPT_ID_ATTR_NAME = "data-script-id";

    public readonly tokens: Token[];
    
    scripts: Map<string, ScriptChunk> = new Map();

    processes: Map<string, ChildProcess> = new Map();

    constructor(tokens: Token[]) {
        this.tokens = this.assignScriptIds(tokens);
    }

    assignScriptIds(tokens: Token[]): Token[] {
        return tokens.map(token => {
            if (token.type === 'fence') {
                const chunk = ScriptChunk.parse(token);
                if (chunk.isRunnable) {
                    const scriptId = uuidv4();
                    token.attrSet(ScriptChunkManager.SCRIPT_ID_ATTR_NAME, scriptId);
                    this.scripts.set(scriptId, chunk);
                }
            }
            return token;
        });  
    }

    public getScript(scriptId: string): ScriptChunk | undefined {
        return this.scripts.get(scriptId);
    }

    public spawnProcess(scriptId: string): ChildProcess {
        const script = this.getScript(scriptId);
        if (script) {
            const process = childProcess.spawn(script.cmd, script.args.concat(script.script));
            this.processes.set(scriptId, process);
            process.on('close', () => {
                this.processes.delete(scriptId);
            });
            return process;
        } else {
            throw new Error(`script chunk ${scriptId} does not exists`);
        }
    }

    public killProcess(scriptId: string) {
        const process = this.processes.get(scriptId);
        if (process) {
            switch (os.platform()) {
                case 'win32':
                    childProcess.spawn("taskkill", ["/pid", process.pid.toString(), '/t', '/f']);
                    return;
                default:
                    process.kill('SIGINT');
                    return;
            }
        }
    }
}
