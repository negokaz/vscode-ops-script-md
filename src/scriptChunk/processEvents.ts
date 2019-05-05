interface ProcessEvent {
    
    eventName: string;

    scriptChunkId: string;
}

export class ExecutionStarted implements ProcessEvent {

    public static topic = "ExecutionStarted";

    public readonly eventName = ExecutionStarted.topic;

    public readonly scriptChunkId: string;

    public readonly startTime: Date;

    constructor(scriptChunkId: string, startTime: Date) {
        this.scriptChunkId = scriptChunkId;
        this.startTime = startTime;
    }
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

    public readonly endTime: Date;

    constructor(scriptChunkId: string, exitCode: number, endTime: Date) {
        this.scriptChunkId = scriptChunkId;
        this.exitCode = exitCode;
        this.endTime = endTime;
    }
}

export class LogLoaded implements ProcessEvent {

    public static topic = "LogLoaded";

    public readonly eventName = LogLoaded.topic;

    public readonly scriptChunkId: string;

    public readonly command: string;

    public readonly script: string;
    
    public readonly start: string;

    public readonly end: string;

    public readonly output: string;

    public readonly exitCode: number;

    constructor(scriptChunkId: string, command: string, script: string, start: string, end: string, output: string, exitCode: number) {
        this.scriptChunkId = scriptChunkId;
        this.command = command;
        this.script = script;
        this.start = start;
        this.end = end;
        this.output = output;
        this.exitCode = exitCode;
    }
}
