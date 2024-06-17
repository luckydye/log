import { captureEvent, captureException } from "@sentry/core";

export class SentryWriteStream extends WritableStream {
  /**
   * @type {NodeJS.Timeout | undefined}
   */
  timer = undefined;

  /**
   * @type {import("./log.js").LogObject[]}
   */
  batch = [];

  async flush() {
    for (const msg of this.batch) {
      if (msg.level === "error") {
        const err = msg.args.find((arg) => arg instanceof Error);
        if (err) {
          captureException(err);
        } else {
          captureEvent({
            message: msg.message,
            extra: msg,
          });
        }
      }
    }

    this.batch.length = 0;
  }

  constructor() {
    super({
      /**
       * @param {import("./log.js").LogObject} msg
       */
      write: async (msg) => {
        this.batch.push(msg);

        if (this.timer !== undefined) {
          clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => this.flush(), 1000);
      },
    });
  }
}
