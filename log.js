const IS_BROWSER =
	typeof window !== 'undefined' && typeof window.document !== 'undefined';
const IS_RUNTIME = !IS_BROWSER && typeof process !== 'undefined';

/**
  * @typedef {{
			ts: Date,
			level: 'error' | 'warn' | 'info' | 'debug',
			prefix?: string,
			location?: string | false,
			message?: string,
			args: any[],
		}} LogObject
*/

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

// Map log level to console method
const consoleLevelMap = /** @type {const} */ ({
	debug: console.debug,
	info: console.info,
	warn: console.warn,
	error: console.error,
});

/**
 * Tint the string with a color
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
					second: '2-digit',
					hour12: false,
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
 * @param {typeof process.env | Window} env
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

/**
 * Parse key-value pairs from arguments
 * @param {any[]} args
 */
function parseArgs(args) {
	/** @type {Record<string, any>} */
	const parsedArgs = {};

	if (args.length <= 1) {
		return;
	}

	// every even index is a string, every odd index is an object
	for (let i = 0; i < args.length; i += 2) {
		parsedArgs[args[i]] = args[i + 1];
	}

	return parsedArgs;
}

/**
 * Format arguments for std output
 * @param {any} value
 */
function formatArgs(value) {
	if (typeof value === 'object') {
		const name = tint(COLORS.FgYellow, value.constructor.name);

		if (Object.keys(value).length > 3) {
			return `${name}${JSON.stringify(value, undefined, '  ')}`;
		}
		return `${name}${tint(COLORS.FgGray, JSON.stringify(value))}`;
	}
	if (typeof value === 'number') {
		return tint(COLORS.FgYellow, value.toString());
	}
	if (typeof value === 'boolean' && value === true) {
		return tint(COLORS.FgGreen, value.toString());
	}
	if (typeof value === 'boolean' && value === false) {
		return tint(COLORS.FgRed, value.toString());
	}
	return value;
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
	 * @type {WritableStream<LogObject>}
	 */
	#stdout = new WritableStream({
		write: async (obj) => {
			if (this.#json) {
				const str = JSON.stringify(obj);

				if (IS_RUNTIME) {
					const std = obj.level === 'error' ? process.stderr : process.stdout;
					std.write(`${str}\n`);
				} else if (IS_BROWSER) {
					(consoleLevelMap[obj.level] || console.log)(str);
				}
			} else {
				const str = `${[
					this.#time && timestamp(this.#time, obj.ts),
					obj.level && level(obj.level),
					obj.location && tint(COLORS.FgGray, `<${obj.location}>`),
					obj.prefix && tint(COLORS.FgGray, obj.prefix + ':'),
					obj.message,
				]
					.filter(Boolean)
					.join(' ')}`;

				if (IS_RUNTIME) {
					const std = obj.level === 'error' ? process.stderr : process.stdout;
					const parsedArgs = parseArgs(obj.args);

					if (parsedArgs) {
						const args = [];
						for (const key of Object.keys(parsedArgs)) {
							args.push(`${tint(COLORS.FgGray, key)}=${formatArgs(parsedArgs[key])}`);
						}
						std.write(`${str} ${args.join(' ')}\n`);
					} else {
						std.write(`${str} ${obj.args.map(formatArgs).join(' ')}\n`);
					}
				} else if (IS_BROWSER) {
					(consoleLevelMap[obj.level] || console.log)(str, ...obj.args);
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
		if (IS_BROWSER && window.JS_LOG != undefined) {
			this.#logLevel = parseEnv(window);
		}
	}

	#output = new Set([this.#stdout]);

	/**
	 * Generic print method
	 * @param  {'error' | 'warn' | 'info' | 'debug'} level
	 * @param  {any[]} args
	 */
	#print = (level, args) => {
		if (
			LOG_LEVELS.indexOf(level) >
			LOG_LEVELS.indexOf(this.#logLevel[this.#prefix || '*'] || this.#logLevel['*'])
		)
			return;

		for (const stream of this.#output) {
			const writer = stream.getWriter();

			/** @type {LogObject} */
			const obj = {
				ts: new Date(),
				level: level,
				prefix: this.#prefix,
				location: this.#trace && trace(),
				message: args[0],
				args: args.slice(1),
			};

			writer.write(obj);
			writer.releaseLock();
		}
	};

	/**
	 * Log info
	 * @param  {...any} args
	 */
	info = (...args) => {
		this.#print('info', args);
	};

	/**
	 * Log error
	 * @param  {...any} args
	 */
	error = (...args) => {
		this.#print('error', args);
	};

	/**
	 * Log warning
	 * @param  {...any} args
	 */
	warn = (...args) => {
		this.#print('warn', args);
	};

	/**
	 * Log debug
	 * @param  {...any} args
	 */
	debug = (...args) => {
		this.#print('debug', args);
	};
}

/**
 * Logger builder
 */
export default function logger() {
	return new Logger();
}
