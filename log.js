// TODO: replace chalk with custom colorizer
// TODO: make smaller

import chalk from 'chalk';

const IS_BROWSER =
	typeof window !== 'undefined' && typeof window.document !== 'undefined';

const LOG_LEVELS = ['info', 'warn', 'error', 'debug'];

/**
 * Generate timestamp string
 * @param {string | boolean} format
 * @param {Date} date
 */
function timestamp(format, date) {
	switch (format) {
		case 'kitchen':
			return date.toLocaleTimeString(undefined, {
				hour: '2-digit',
				minute: '2-digit',
			});
		case 'iso':
			return date.toISOString();
		case 'utc':
			return date.toUTCString();
		default:
			return date.toLocaleString(undefined, {
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
		?.split('\n')[4]
		.split(' ')
		.pop()
		?.split('/')
		.reverse()
		.slice(0, 2)
		.reverse()
		.join('/')
		?.replace(/\(|\)/g, '');
}

/**
 * Format log level
 * @param {string} lvl
 */
function level(lvl) {
	switch (lvl) {
		case 'info':
			return chalk.cyan(lvl.toUpperCase());
		case 'warn':
			return chalk.yellow(lvl.toUpperCase());
		case 'error':
			return chalk.red(lvl.toUpperCase());
		default:
			return lvl.toUpperCase();
	}
}

/**
 * Logger builder
 * @param {string} prefix
 */
class Logger {
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
	 * @type {string} - debug > error > warn > info
	 */
	#level = 'info';

	/**
	 * Display output stream
	 */
	#stdout = new WritableStream({
		write: async (obj) => {
			if (LOG_LEVELS.indexOf(obj.level) > LOG_LEVELS.indexOf(this.#level)) return;

			let str;

			if (this.#json) {
				str = JSON.stringify(obj);
			} else {
				str = `${[
					this.#time && timestamp(this.#time, obj.ts),
					obj.level && level(obj.level),
					obj.location && chalk.gray(`<${obj.location}>`),
					obj.prefix && chalk.gray(obj.prefix),
				]
					.filter(Boolean)
					.join(' ')}${chalk.gray(':')} ${obj.msg}`;
			}

			if (IS_BROWSER) {
				switch (obj.level) {
					case 'debug':
						console.debug(
							`${obj.ts} %c${obj.prefix}`,
							`color: gray; font-weight: normal`,
							...obj.args
						);
						break;
					case 'error':
						console.error(
							`${obj.ts} %c${obj.prefix}`,
							`color: gray; font-weight: normal`,
							...obj.args
						);
						break;
					case 'warn':
						console.warn(
							`${obj.ts} %c${obj.prefix}`,
							`color: gray; font-weight: normal`,
							...obj.args
						);
						break;
					default:
						console.log(
							`${obj.ts} %c${obj.prefix}`,
							`color: gray; font-weight: normal`,
							...obj.args
						);
						break;
				}
			} else {
				switch (obj.level) {
					case 'error':
						process.stderr.write(str + '\n');
						break;
					default:
						process.stdout.write(str + '\n');
						break;
				}
			}
		},
	});

	/**
	 * Set prefix
	 * @param {string} prefix
	 */
	prefix(prefix) {
		this.#prefix = prefix;
		return this;
	}

	/**
	 * Set tmestamp format
	 * @param {boolean | "local" | "kitchen" | "iso" | "utc"} format
	 */
	time(format) {
		this.#time = format;
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
	 * Enable stack tracing
	 */
	json() {
		this.#json = true;
		return this;
	}

	/**
	 * Pipe logs to stream
	 * @param {WritableStream} stream
	 */
	pipeTo(stream) {
		this.#output.add(stream);
		return this;
	}

	constructor() {
		if (process.env.JS_LOG != undefined) {
			this.#level = process.env.JS_LOG;
		}
	}

	#output = new Set([this.#stdout]);

	/**
	 * Generic log
	 * @param  {string} level
	 * @param  {...any} args
	 */
	#log = (level, ...args) => {
		const obj = {
			ts: new Date(),
			level: level,
			prefix: this.#prefix,
			location: this.#trace && trace(),
			msg: args.join(' '),
			args: args,
		};

		for (const stream of this.#output) {
			const writer = stream.getWriter();
			writer.write(obj);
			writer.releaseLock();
		}
	};

	/**
	 * Log info
	 * @param  {...any} args
	 */
	info = (...args) => {
		this.#log('info', ...args);
	};

	/**
	 * Log error
	 * @param  {...any} args
	 */
	error = (...args) => {
		this.#log('error', ...args);
	};

	/**
	 * Log warning
	 * @param  {...any} args
	 */
	warn = (...args) => {
		this.#log('warn', ...args);
	};

	/**
	 * Log debug
	 * @param  {...any} args
	 */
	debug = (...args) => {
		this.#log('debug', ...args);
	};
}

export default function logger() {
	return new Logger();
}

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
						body: `${options.db},level=${msg.level} msg="${msg.msg}" ${msg.ts.valueOf()}`,
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
