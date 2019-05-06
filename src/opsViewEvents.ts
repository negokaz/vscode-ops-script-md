interface OpsViewEvent {
    
    eventName: string;
}

export class TriggeredReload implements OpsViewEvent {

    public static topic = "TriggeredReload";

    public readonly eventName = TriggeredReload.topic;
}

export class ChangedDocument implements OpsViewEvent {

    public static topic = "ChangedDocument";

    public readonly eventName = ChangedDocument.topic;
}