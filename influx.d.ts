/**
 * Writable stream to InfluxDB
 */
export class InfluxWriteStream extends WritableStream<any> {
    /**
     * @param {{ url: string, bucket: string, db: string, org: string, token: string }} options
     */
    constructor(options: {
        url: string;
        bucket: string;
        db: string;
        org: string;
        token: string;
    });
    /**
     * @type {NodeJS.Timeout | undefined}
     */
    timer: NodeJS.Timeout | undefined;
    /**
     * @type {string[]}
     */
    batch: string[];
    /**
     * @type {{ url: string, bucket: string, db: string, org: string, token: string }}
     */
    options: {
        url: string;
        bucket: string;
        db: string;
        org: string;
        token: string;
    };
    flush(): Promise<void>;
}
