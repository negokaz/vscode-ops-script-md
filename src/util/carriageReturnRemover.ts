import * as stream from 'stream';

export default class CarriageReturnRemover extends stream.Transform {

    public static transformStream(): CarriageReturnRemover {
        return new CarriageReturnRemover();
    }

    constructor() {
        super({
            objectMode: true
        });
    }

    _transform(chunk: string, encoding: string, done: stream.TransformCallback) {
        this.push(chunk.replace(/\r/g, ''), encoding);
        done();
    }
}
