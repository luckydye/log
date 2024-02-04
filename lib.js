import chalk from 'chalk'; // TODO: replace chalk with custom colorizer

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * Logger builder
 * @param {string} prefix
 */
class Logger {
	/**
	 * Origin log stream
	 */
	#output = new WritableStream({
		async write(chunk) {
			process.stdout.write(chunk);
		},
	});

	#read = new ReadableStream({
		async start(controller) {
			controller.enqueue('Hello');
		},
	});

	/**
	 * Log prefix
	 * @type {string | undefined}
	 */
	#prefix = undefined;

	/**
	 * Stack trace
	 * @type {boolean}
	 */
	#trace = false;

	/**
	 * Timestamp
	 * @type {boolean | "local" | "kitchen" | "iso" | "utc"}
	 */
	#time = 'local';

	/**
	 * Json output
	 * @type {boolean}
	 */
	#json = false;

	/**
	 * Log level
	 *
	 * TODO: mimic rust env_logger. Filter multiple scopes
	 *
	 * @type {string} - debug > error > warn > info
	 */
	#level = 'debug';

	constructor() {
		if (process.env.JS_LOG != undefined) {
			this.#level = process.env.JS_LOG;
		}
	}

	/**
	 * Log error
	 * @param  {...any} args
	 */
	info(...args) {
		const _log = console.info;

		const obj = {
			ts: this.#time && timestamp(this.#time),
			level: 'INFO',
			prefix: this.#prefix,
			location: this.#trace && trace(),
			msg: args.join(' '),
		};

		if (isBrowser) {
			_log(
				`${timestamp(this.#time)} %c${this.#prefix}`,
				`color: gray; font-weight: normal`,
				...args
			);
		} else {
			const writer = this.#output.getWriter();

			if (this.#json) {
				writer.write(JSON.stringify(obj));
			} else {
				const content = [
					this.#time && obj.ts,
					obj.level && chalk.cyan(obj.level),
					obj.location && `<${chalk.gray(obj.location)}>`,
					obj.prefix && chalk.gray(obj.prefix),
				]
					.filter(Boolean)
					.join(' ');

				writer.write([`${content}${chalk.gray(':')}`, obj.msg].join(' '));
			}

			writer.releaseLock();
		}
	}

	/**
	 * Set prefix
	 * @param {string} prefix
	 */
	prefix(prefix) {
		this.#prefix = prefix;
		return this;
	}

	/**
	 * Enable stack tracing
	 */
	trace() {
		this.#trace = true;
		return this;
	}

	/**
	 * Pipe logs to stream
	 * @param {TransformStream} stream
	 */
	pipeTo(stream) {
		const [read1, read2] = this.#read.tee();
	}
}

export default function logger() {
	return new Logger();
}

/**
 * Writable stream to InfluxDB
 */
export class InfluxLogStream extends TransformStream {
	/**
	 * @param {{ url: string, bucket: string, token: string }} options
	 */
	constructor(options) {
		super({
			async transform(msg, controller) {
				controller.enqueue(msg);

				await fetch(`${options.url}/api/v2/write?bucket=${options.bucket}`, {
					method: 'POST',
					headers: {
						Authorization: `Token ${options.token}`,
					},
					body: JSON.stringify(msg),
				}).then(() => {});
			},
		});
	}
}

/**
 * Generate timestamp string
 * @param {string | boolean} format
 */
function timestamp(format) {
	switch (format) {
		case 'kitchen':
			return new Date().toLocaleTimeString(undefined, {
				hour: '2-digit',
				minute: '2-digit',
			});

		case 'iso':
			return new Date().toISOString();

		case 'utc':
			return new Date().toUTCString();

		default:
			return new Date().toLocaleString(undefined, {
				hour: '2-digit',
				minute: '2-digit',
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			});
	}
}

/**
 * Get last frame of stack trace
 */
function trace() {
	return new Error().stack
		?.split('\n')[3]
		.split(' ')
		.pop()
		?.split('/')
		.reverse()
		.slice(0, 2)
		.reverse()
		.join('/')
		?.replace(/\(|\)/g, '');
}
