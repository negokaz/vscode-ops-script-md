interface ProcessEvent {
    
    eventName: string;

    scriptChunkId: string;
}

export class StdoutProduced implements ProcessEvent {

    public static topic = "StdoutProduced";

    public readonly eventName = StdoutProduced.topic;

    public readonly scriptChunkId: string;

    public readonly data: string;

    constructor(scriptChunkId: string, data: string) {
        this.scriptChunkId = scriptChunkId;
        this.data = data;
    }
}

export class StderrProduced implements ProcessEvent {

    public static topic = "StderrProduced";

    public readonly eventName = StderrProduced.topic;

    public readonly scriptChunkId: string;

    public readonly data: string;

    constructor(scriptChunkId: string, data: string) {
        this.scriptChunkId = scriptChunkId;
        this.data = data;
    }
}

export class SpawnFailed implements ProcessEvent {

    public static topic = "SpawnFailed";

    public readonly eventName = SpawnFailed.topic;

    public readonly scriptChunkId: string;

    public readonly cause: Error;

    constructor(scriptChunkId: string, cause: Error) {
        this.scriptChunkId = scriptChunkId;
        this.cause = cause;
    }
}

export class ProcessCompleted implements ProcessEvent {

    public static topic = "ProcessCompleted";

    public readonly eventName = ProcessCompleted.topic;

    public readonly scriptChunkId: string;

    public readonly exitCode: number;

    constructor(scriptChunkId: string, exitCode: number) {
        this.scriptChunkId = scriptChunkId;
        this.exitCode = exitCode;
    }
}