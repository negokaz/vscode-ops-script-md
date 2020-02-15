import * as PubSub from 'pubsub-js';

export default class OpsViewEventBus {

    public static for(viewId: string): OpsViewEventBus {
        return new OpsViewEventBus(viewId);
    }

    private readonly viewId: string;

    private constructor(viewId: string) {
        this.viewId = viewId;
    }

    public publish(topic: string, event: any) {
        PubSub.publish(`${this.viewId}.${topic}`, event);
    }

    public subscribe(topic: string, handler: (event: any) => void) {
        PubSub.subscribe(`${this.viewId}.${topic}`, (msg: any, message: any) => {
            handler(message);
        });
    }

    public unsbscribeAll() {
        PubSub.unsubscribe(this.viewId);
    }
}
