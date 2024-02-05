// TODO: make smaller
// TODO: try to match rust logger namespacing

const IS_RUNTIME = typeof process !== 'undefined';
const IS_BROWSER =
	typeof window !== 'undefined' && typeof window.document !== 'undefined';

// Log levels ordered by severity
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

// ANSI color codes
const COLORS = /** @type {const} */ ({
	RESET: '\x1b[0m',

	FgBlack: '\x1b[30m',
	FgRed: '\x1b[31m',
	FgGreen: '\x1b[32m',
	FgYellow: '\x1b[33m',
	FgBlue: '\x1b[34m',
	FgMagenta: '\x1b[35m',
	FgCyan: '\x1b[36m',
	FgWhite: '\x1b[37m',
	FgGray: '\x1b[90m',
});

/**
 * Foreground colors
 * @param {typeof COLORS[keyof typeof COLORS]} color
 * @param {string} str
 */
function tint(color, str) {
	return `${color}${str}${COLORS.RESET}`;
}

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
			return date
				.toLocaleString(undefined, {
					hour: '2-digit',
					minute: '2-digit',
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
				})
				.replace(',', '');
	}
}

/**
 * Get last frame of stack trace
 */
function trace() {
	const lines = new Error().stack?.split('\n').slice(1);
	if (!lines) return;

	const match = lines.slice(3)[0]?.match(/at (.+) \((.+)\)/);
	if (match) {
		const [, , file] = match;
		return file.split('/').pop();
	}
}

/**
 * Format log level
 * @param {string} lvl
 */
function level(lvl) {
	switch (lvl) {
		case 'info':
			return tint(COLORS.FgCyan, lvl.toUpperCase());
		case 'warn':
			return tint(COLORS.FgYellow, lvl.toUpperCase());
		case 'error':
			return tint(COLORS.FgRed, lvl.toUpperCase());
		case 'debug':
			return tint(COLORS.FgGray, lvl.toUpperCase());
		default:
			return lvl.toUpperCase();
	}
}

/**
 * Parse log level from environment variable
 * @param {typeof process.env} env
 */
function parseEnv(env) {
	/** @type {Record<string, string>} */
	const scopes = {};

	const levels = env.JS_LOG?.split(',').map((lvl) => lvl.split('='));
	if (!levels) return scopes;

	for (const arr of levels) {
		if (arr.length === 1) {
			scopes['*'] = arr[0];
		} else {
			scopes[arr[0]] = arr[1];
		}
	}

	return scopes;
}

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
	 * Log level by prefix scope or "*" for global scope
	 * @type {Record<string, string>}
	 */
	#logLevel = {
		'*': 'info',
	};

	/**
	 * Display output stream
	 */
	#stdout = new WritableStream({
		write: async (obj) => {
			let str;

			if (this.#json) {
				str = JSON.stringify(obj);
			} else {
				str = `${[
					this.#time && timestamp(this.#time, obj.ts),
					obj.level && level(obj.level),
					obj.location && tint(COLORS.FgGray, `<${obj.location}>`),
					obj.prefix && tint(COLORS.FgGray, obj.prefix),
				]
					.filter(Boolean)
					.join(' ')}${tint(COLORS.FgGray, ':')}`;
			}

			if (IS_RUNTIME) {
				switch (obj.level) {
					case 'error':
						process.stderr.write(`${str} ${obj.msg}\n`);
						break;
					default:
						process.stdout.write(`${str} ${obj.msg}\n`);
						break;
				}
			} else if (IS_BROWSER) {
				switch (obj.level) {
					case 'debug':
						console.debug(str, ...obj.args);
						break;
					case 'error':
						console.error(str, ...obj.args);
						break;
					case 'warn':
						console.warn(str, ...obj.args);
						break;
					default:
						console.info(str, ...obj.args);
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
		if (IS_RUNTIME && process.env.JS_LOG != undefined) {
			this.#logLevel = parseEnv(process.env);
		}
	}

	#output = new Set([this.#stdout]);

	/**
	 * Generic log
	 * @param  {string} level
	 * @param  {...any} args
	 */
	#log = (level, ...args) => {
		if (
			LOG_LEVELS.indexOf(level) >
			LOG_LEVELS.indexOf(this.#logLevel[this.#prefix || '*'] || this.#logLevel['*'])
		)
			return;

		for (const stream of this.#output) {
			const writer = stream.getWriter();

			// TODO: args should be parsed as key values.

			writer.write({
				ts: new Date(),
				level: level,
				prefix: this.#prefix,
				location: this.#trace && trace(),
				msg: args.join(' '),
				args: args,
			});
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

/**
 * Logger builder
 */
export default function logger() {
	return new Logger();
}
