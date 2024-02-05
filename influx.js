/**
 * Writable stream to InfluxDB
 */
export class InfluxWriteStream extends WritableStream {
	/**
	 * @type {NodeJS.Timeout | undefined}
	 */
	timer = undefined;

	/**
	 * @type {string[]}
	 */
	batch = [];

	/**
	 * @type {{ url: string, bucket: string, db: string, org: string, token: string }}
	 */
	options;

	async flush() {
		await fetch(
			`${this.options.url}/api/v2/write?org=${this.options.org}&bucket=${this.options.bucket}&precision=ms`,
			{
				method: 'POST',
				headers: {
					Authorization: `Token ${this.options.token}`,
				},
				body: this.batch.join('\n'),
			}
		).then(async (res) => {
			if (!res.ok) {
				throw new Error('Failed to write to InfluxDB: ' + (await res.text()));
			}
		});
		this.batch.length = 0;
	}

	/**
	 * @param {{ url: string, bucket: string, db: string, org: string, token: string }} options
	 */
	constructor(options) {
		super({
			/**
			 * @param {import("./log.js").LogObject} msg
			 */
			write: async (msg) => {
				const body = `${options.db},prefix="${msg.prefix}",level="${msg.level}" log="${
					msg.message
				}" ${msg.ts.valueOf()}`;

				this.batch.push(body);

				if (this.timer != undefined) {
					clearTimeout(this.timer);
				}

				this.timer = setTimeout(() => {
					this.flush();
				}, 1000);
			},
		});

		this.options = options;
	}
}
