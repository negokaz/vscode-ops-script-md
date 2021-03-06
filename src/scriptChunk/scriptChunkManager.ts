import * as uuidv4 from 'uuid/v4';
import Token from 'markdown-it/lib/token';
import ScriptChunk from './scriptChunk';
import * as crypto from 'crypto';
import Config from '../config/config';

export default class ScriptChunkManager {

    public static readonly SCRIPT_CHUNK_ID_ATTR_NAME = "data-script-chunk-id";
    
    private readonly config: Config;

    private scriptChunks: Map<string, ScriptChunk> = new Map();

    constructor(config: Config) {
        this.config = config;
    }

    public assignScriptChunks(tokens: Token[]): Promise<Token[]> {
        return Promise.all(tokens.map(async token => {
            if (token.type === 'fence') {
                const chunk = await ScriptChunk.parse(token, this.config);
                if (chunk.isEnable) {
                    const scriptChunkId = this.generateScriptChunkId(chunk);
                    token.attrSet(ScriptChunkManager.SCRIPT_CHUNK_ID_ATTR_NAME, scriptChunkId);
                    this.scriptChunks.set(scriptChunkId, chunk);
                }
            }
            return token;
        }));  
    }

    generateScriptChunkId(scriptChunk: ScriptChunk): string {
        let scriptChunkId = '';
        for (let i = 0; scriptChunkId.length === 0 || this.scriptChunks.has(scriptChunkId); i++) {
            const md5 = crypto.createHash('md5');
            md5.update(scriptChunk.cmd);
            md5.update(scriptChunk.args.join(' '));
            md5.update(scriptChunk.script);
            md5.update(i.toString());
            scriptChunkId = md5.digest('hex');
        }
        return scriptChunkId;
    }

    public getScriptChunk(scriptChunkId: string): ScriptChunk {
        const scriptChunk =  this.scriptChunks.get(scriptChunkId);
        if (scriptChunk) {
            return scriptChunk;
        } else {
            throw new Error(`Illegal scriptChunkId: ${scriptChunkId}`);
        }
    }

    public hasScriptChunk(scriptChunkId: string): boolean {
        return this.scriptChunks.has(scriptChunkId);
    }

    public killAllRunningScriptChunk(): void {
        for (let scriptChunkId of this.scriptChunks.keys()) {
            this.getScriptChunk(scriptChunkId).killProcess();
        }
    }
}
