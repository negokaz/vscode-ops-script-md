import { Uri } from "vscode";

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

export class OpenLink implements OpsViewEvent {

    public static topic = "OpenLink";

    public readonly eventName = OpenLink.topic;

    public readonly href: Uri;

    constructor(href: Uri) {
        this.href = href;
    }
}
