import ScriptChunkManager from "../scriptChunk/scriptChunkManager";

export default class ParseResult {
    
    public readonly html: string;

    public readonly scriptChunkManager: ScriptChunkManager;

    constructor(html: string, scriptChunkManager: ScriptChunkManager) {
        this.html = html;
        this.scriptChunkManager = scriptChunkManager;
    }
}
