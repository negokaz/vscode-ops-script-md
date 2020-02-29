import { Uri } from "vscode";
import ScriptChunkManager from "../scriptChunk/scriptChunkManager";

export default class MarkdownRenderEnv {

    public readonly scriptChunkManager: ScriptChunkManager;

    constructor(scriptChunkManager: ScriptChunkManager) {
        this.scriptChunkManager = scriptChunkManager;
    }
}
