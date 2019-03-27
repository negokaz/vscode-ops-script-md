import * as uuidv4 from 'uuid/v4';
import { Token } from 'markdown-it';
import ScriptChunk from './scriptChunk';

export default class ScriptChunkManager {

    public static readonly SCRIPT_CHUNK_ID_ATTR_NAME = "data-script-chunk-id";

    public readonly tokens: Token[];
    
    scriptChunks: Map<string, ScriptChunk> = new Map();

    constructor(tokens: Token[]) {
        this.tokens = this.assignScriptChunkIds(tokens);
    }

    assignScriptChunkIds(tokens: Token[]): Token[] {
        return tokens.map(token => {
            if (token.type === 'fence') {
                const chunk = ScriptChunk.parse(token);
                if (chunk.isRunnable) {
                    const scriptChunkId = uuidv4();
                    token.attrSet(ScriptChunkManager.SCRIPT_CHUNK_ID_ATTR_NAME, scriptChunkId);
                    this.scriptChunks.set(scriptChunkId, chunk);
                }
            }
            return token;
        });  
    }

    public getScriptChunk(scriptChunkId: string): ScriptChunk {
        const scriptChunk =  this.scriptChunks.get(scriptChunkId);
        if (scriptChunk) {
            return scriptChunk;
        } else {
            throw new Error(`Illegal scriptChunkId: ${scriptChunkId}`);
        }
    }
}
