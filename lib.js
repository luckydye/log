import chalk from './node_modules/chalk/source/index';

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

function timestamp() {
	return new Date().toLocaleString();
}

function trace() {
	return new Error().stack
		.split('\n')[3]
		.split(' ')
		.pop()
		.split('/')
		.reverse()
		.slice(0, 2)
		.reverse()
		.join('/');
}

/**
 * Logger builder
 * @param {string} prefix
 */
class Logger {
	/**
	 * Origin log stream
	 */
	#stream = new ReadableStream({
		async start(controller) {
			// TODO
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
	 * Log error
	 * @param  {...any} args
	 */
	info(...args) {
		const _log = console.info;

		if (isBrowser) {
			_log(
				`${timestamp()} %c${this.#prefix}`,
				`color: gray; font-weight: normal`,
				...args
			);
		} else {
			const content = [
				timestamp(),
				chalk.cyan('INFO'),
				this.#trace && chalk.gray(`<${trace()}>`),
				this.#prefix && chalk.gray(this.#prefix),
			]
				.filter(Boolean)
				.join(' ');

			_log(`${content}${chalk.gray(':')}`, args[0], ...args.slice(1));
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
	pipe(stream) {
		this.#stream.pipeThrough(stream);
		// TODO
		return this;
	}
}

export default function logger() {
	return new Logger();
}

/**
 * Writable stream to stdout or stderr
 */
class StdoutStream extends TransformStream {
	/**
	 * @param {{ }} options
	 */
	constructor(options) {
		super({
			async write(chunk) {
				process.stdout.write(chunk);
			},
		});
	}
}

/**
 * Writable stream to InfluxDB
 */
class InfluxLogStream extends TransformStream {
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
