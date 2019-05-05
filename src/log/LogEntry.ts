export default class LogEntry {

    public readonly scriptChunkId: string;

    public command: string = '';

    public script: string = '';
    
    public start: string = '';

    public end: string = '';

    public output: string = '';

    public exitCode: number = 0;

    constructor(scriptChunkId: string) {
        this.scriptChunkId = scriptChunkId;
    }
}