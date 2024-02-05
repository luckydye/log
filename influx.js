/**
 * Writable stream to InfluxDB
 */
export class InfluxWriteStream extends WritableStream {
	/**
	 * @param {{ url: string, bucket: string, db: string, org: string, token: string }} options
	 */
	constructor(options) {
		super({
			async write(msg) {
				return await fetch(
					`${options.url}/api/v2/write?org=${options.org}&bucket=${options.bucket}&precision=ms`,
					{
						method: 'POST',
						headers: {
							Authorization: `Token ${options.token}`,
						},
						body:
							options.db +
							`,level=${msg.level} prefix="${msg.prefix}" msg="${msg.args.join(' ')}" ` +
							msg.ts.valueOf(),
					}
				).then(async (res) => {
					if (!res.ok) {
						throw new Error('Failed to write to InfluxDB: ' + (await res.text()));
					}
				});
			},
		});
	}
}
