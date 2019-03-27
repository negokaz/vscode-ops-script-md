import * as uuidv4 from 'uuid/v4';
import { Token } from 'markdown-it';
import ScriptChunk from './scriptChunk';

export default class ScriptChunkManager {

    public static readonly SCRIPT_ID_ATTR_NAME = "data-script-id";

    public readonly tokens: Token[];
    
    scripts: Map<string, ScriptChunk> = new Map();

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

    public getScript(scriptId: string): ScriptChunk {
        const script =  this.scripts.get(scriptId);
        if (script) {
            return script;
        } else {
            throw new Error(`Illegal scriptId: ${scriptId}`);
        }
    }
}
