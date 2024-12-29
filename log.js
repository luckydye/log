const ESC = "\x1b";
const IS_BROWSER =
  typeof window !== "undefined" && typeof window.document !== "undefined";
const IS_RUNTIME = !IS_BROWSER;

/** @type {any} */
const global = globalThis;

const proc = global.process || global.Deno || {};
const stderr = IS_RUNTIME ? proc.stderr : undefined;

const textEncoder = new TextEncoder();

/**
 * @typedef {NodeJS.ProcessEnv} Env
 */

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
const LOG_LEVELS = ["error", "warn", "info", "debug"];

// ANSI color codes
const COLORS = /** @type {const} */ ({
  RESET: "\x1b[0m",

  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",
  FgGray: "\x1b[90m",
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
    case "kitchen":
      return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "iso":
      return date.toISOString();
    case "utc":
      return date.toUTCString();
    default:
      return date
        .toLocaleString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(",", "");
  }
}

/**
 * Get last frame of stack trace
 */
function trace() {
  const lines = new Error().stack?.split("\n").slice(1);
  if (!lines) return;

  const match = lines.slice(3)[0]?.match(/at (.+) \((.+)\)/);
  if (match) {
    const [, , file] = match;
    return file?.split("/").pop();
  }

  const match2 = lines.slice(3)[0]?.match(/at (.+)/);
  if (match2) {
    const [file] = match2;
    return file?.split("/").pop()?.split("?")[0];
  }
  // console.error('logging error:', 'failed to parse stack trace');
}

/**
 * Format log level
 * @param {string} lvl
 */
function flevel(lvl) {
  switch (lvl) {
    case "info":
      return tint(COLORS.FgCyan, lvl.toUpperCase());
    case "warn":
      return tint(COLORS.FgYellow, lvl.toUpperCase());
    case "error":
      return tint(COLORS.FgRed, lvl.toUpperCase());
    case "debug":
      return tint(COLORS.FgGray, lvl.toUpperCase());
    default:
      return lvl.toUpperCase();
  }
}

/**
 * Parse log level from environment variable
 * @param {string | undefined} logLevel
 */
function parseLogLevel(logLevel) {
  /** @type {Record<string, string>} */
  const scopes = {};

  const levels = logLevel?.split(",").map((lvl) => lvl.split("="));
  if (!levels) return scopes;

  for (const arr of levels) {
    if (arr.length === 1) {
      scopes["*"] = arr[0];
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
function parseKeyValueArgs(args) {
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
  if (value instanceof Event) {
    return `${tint(COLORS.FgYellow, value.constructor.name)}${tint(
      COLORS.FgGray,
      `{"${value.type}"}`,
    )}`;
  }
  if (value instanceof Error) {
    return `${value.message}\n${value.stack ? tint(COLORS.FgGray, value.stack) : ""}\n`;
  }
  if (typeof value === "object" && value !== null) {
    const name = tint(COLORS.FgYellow, value.constructor.name);

    if (Object.keys(value).length > 3) {
      return `${name}${JSON.stringify(value, undefined, "  ")}`;
    }
    return `${name}${tint(COLORS.FgGray, JSON.stringify(value))}`;
  }
  if (typeof value === "number") {
    return tint(COLORS.FgYellow, value.toString());
  }
  if (typeof value === "boolean" && value === true) {
    return tint(COLORS.FgGreen, value.toString());
  }
  if (typeof value === "boolean" && value === false) {
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
  #time = "local";

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
    "*": "info",
  };

  /**
   * stdout or stderr
   */
  #stdio = stderr;

  /**
   * Writeable streams to pipe logs to
   * @type {Set<WritableStream<LogObject>>}
   */
  #streams = new Set();

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

  constructor(stdio = stderr) {
    this.#stdio = stdio;

    this.#logLevel = parseLogLevel(
      IS_RUNTIME ? proc.env.JS_LOG || global.JS_LOG || "error" : global.JS_LOG,
    );
  }

  /**
   * Return formatted string of preamble
   * @param {LogObject} obj
   */
  #preabmle = (obj) => {
    return `${[
      this.#time && timestamp(this.#time, obj.ts),
      obj.level && flevel(obj.level),
      obj.location && tint(COLORS.FgGray, `<${obj.location}>`),
      obj.prefix && tint(COLORS.FgGray, `${obj.prefix}:`),
      obj.message,
    ]
      .filter(Boolean)
      .join(" ")}`;
  };

  /**
   * Send log object
   * @param {LogObject} obj
   */
  #log = (obj) => {
    if (!this.checkLevel(obj.level)) return;

    if (IS_RUNTIME) {
      this.#stdio?.write(textEncoder.encode(`${this.#print(obj)}\n`));
    }

    if (IS_BROWSER) {
      const write = consoleLevelMap[obj.level] || console.log;

      if (this.#json) {
        write(obj);
      } else {
        const str = this.#preabmle(obj);
        const parsedArgs = parseKeyValueArgs(obj.args);

        if (parsedArgs) {
          /** @type {any[]} */
          const args = [];
          let fstr = "";

          for (const key of Object.keys(parsedArgs)) {
            fstr += ` ${tint(COLORS.FgGray, key)}=%o`;
            args.push(parsedArgs[key]);
          }

          write(`%s${fstr}`, str, ...args);
        } else {
          write(str, ...obj.args);
        }
      }
    }

    for (const stream of this.#streams) {
      const writer = stream.getWriter();
      writer.write(obj);
      writer.releaseLock();
    }
  };

  /**
   * Check log level
   * @private
   * @param {string} level
   * @returns {boolean}
   */
  checkLevel = (level) => {
    if (
      LOG_LEVELS.indexOf(level) >
      LOG_LEVELS.indexOf(
        this.#logLevel[this.#prefix || "*"] || this.#logLevel["*"],
      )
    )
      return false;

    return true;
  };

  /**
   * @param {LogObject} obj
   */
  #print = (obj) => {
    if (this.#json) {
      return JSON.stringify(obj);
    }

    const str = this.#preabmle(obj);
    const parsedArgs = parseKeyValueArgs(obj.args);

    if (parsedArgs) {
      const args = [];
      for (const key of Object.keys(parsedArgs)) {
        args.push(`${tint(COLORS.FgGray, key)}=${formatArgs(parsedArgs[key])}`);
      }
      return `${str} ${args.join(" ")}`;
    }

    if (obj.args.length > 0) {
      return `${str} ${obj.args.map(formatArgs).join(" ")}`;
    }

    return str;
  };

  /**
   * Return formatted string
   * @param {'error' | 'warn' | 'info' | 'debug'} level
   * @param {any[]} args
   * @returns {LogObject}
   */
  #parseArgs = (level, args) => {
    return {
      ts: new Date(),
      level: level,
      prefix: this.#prefix,
      location: this.#trace && trace(),
      message: args[0],
      args: args.slice(1),
    };
  };

  /**
   * Pipe logs to stream
   * @param {WritableStream} stream
   */
  pipeTo(stream) {
    this.#streams.add(stream);
    return this;
  }

  /**
   * Return formatted log string
   * @param {'error' | 'warn' | 'info' | 'debug'} level
   * @param {any[]} args
   */
  sprint = (level, ...args) => {
    return this.#print(this.#parseArgs(level, args));
  };

  /**
   * Log info
   * @param  {...any} args
   */
  info = (...args) => {
    this.#log(this.#parseArgs("info", args));
  };

  /**
   * Log error
   * @param  {...any} args
   */
  error = (...args) => {
    this.#log(this.#parseArgs("error", args));
  };

  /**
   * Log warning
   * @param  {...any} args
   */
  warn = (...args) => {
    this.#log(this.#parseArgs("warn", args));
  };

  /**
   * Log debug
   * @param  {...any} args
   */
  debug = (...args) => {
    this.#log(this.#parseArgs("debug", args));
  };

  /**
   * An assertion. Throws an error if condition is false.
   * @param {any} condition
   * @param {string} [message]
   */
  assert = (condition, message) => {
    if (
      condition === false ||
      condition === undefined ||
      condition === null ||
      condition === ""
    ) {
      const err = new AssertionError(message);
      this.#log(this.#parseArgs("error", ["", "assert", err]));
      throw err;
    }
  };

  /**
   * Log an image. Only works in terminals that support the kitty graphics protocol.
   * @param {string | ArrayBuffer} [filenameOrBuffer]
   * @param {string} [imageId]
   * @param {boolean} [display]
   */
  img = (filenameOrBuffer, imageId, display = true) => {
    if (!this.#stdio || !IS_RUNTIME) {
      return;
    }

    let id = imageId;

    if (filenameOrBuffer) {
      id = sendImage(filenameOrBuffer, this.#stdio, imageId);
    }

    if (display) {
      printImage(this.#stdio, id);
    }
  };
}

/**
 * Logger builder
 ^ @param {NodeJS.WriteStream} [stdio]
 */
export default function logger(stdio) {
  return new Logger(stdio);
}

class AssertionError extends Error {}

/**
 * Creates a temporary logger and calls its assert method.
 * @param {any} condition
 * @param {string} [message]
 */
export function assert(condition, message) {
  if (
    condition === false ||
    condition === undefined ||
    condition === null ||
    condition === ""
  ) {
    const err = new AssertionError(message);
    logger().trace().error("", "assert", err);
    throw err;
  }
}

/**
 * Creates a temporary logger and calls its assert method with a TODO message.
 * @param {string} message
 */
export function todo(message) {
  const err = new AssertionError(message);
  logger().trace().error("", "TODO", err);
  throw err;
}

/**
 * Encode buffer to base64
 * @param {ArrayBuffer | Array<number>} data
 */
function base64(data) {
  return btoa(
    new Uint8Array(data).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      "",
    ),
  );
}

let imageIdInc = 0;
// const imageIds = new Map();

/**
 * Send an image to the terminal
 * @param {string | ArrayBuffer} filenameOrBuffer - Absolute path to image or image buffer
 * @param {NodeJS.WriteStream} io
 * @param {string} [imageId]
 */
export function sendImage(filenameOrBuffer, io, imageId) {
  // TODO: Query Support
  //
  // const p = spawnSync(
  //   "printf",
  //   [`${ESC}_Gi=12312312312,s=1,v=1,a=q,t=d,f=24;AAAA${ESC}\\`],
  //   {
  //     stdio: ["pipe", "pipe", "inherit"],
  //   },
  // );
  // console.info(p.stdout.buffer);
  // return;

  // TODO: use cache by id
  //
  // const cachedImageId = imageIds.get(filenameOrBuffer);
  // if (cachedImageId) {
  //   io.write(`${ESC}_Ga=p,i=${cachedImageId},q=2;${ESC}\\\n`);
  //   return;
  // }

  const id = imageId || (++imageIdInc).toString();
  // imageIds.set(filenameOrBuffer, id);

  if (typeof filenameOrBuffer === "string") {
    const encoder = new TextEncoder();
    const name = encoder.encode(filenameOrBuffer);
    io.write(textEncoder.encode(`\x1b_Gi=${id},q=2,f=100,t=f;${name}\x1b\\`));
  } else {
    io.write(
      textEncoder.encode(
        `${ESC}_Gi=${id},q=2,f=100,t=d;${base64(filenameOrBuffer)}${ESC}\\`,
      ),
    );
  }

  // TODO: Unicode placement
  // io.write(`${ESC}_Ga=p,U=1,i=${imageIdInc},q=2${ESC}\\\n`);
  // io.write(
  //   `${ESC}[38;5;${imageIdInc}m\\U10EEEE\\U0305\\U0305\\U10EEEE\\U0305\\U030D${ESC}[39m\n`,
  // );
  // io.write(
  //   `${ESC}[38;5;${imageIdInc}m\\U10EEEE\\U030D\\U0305\\U10EEEE\\U030D\\U030D${ESC}[39m\n`,
  // );

  return id;
}

/**
 * Print image to terminal
 * @param {NodeJS.WriteStream} io
 * @param {string} [imageId]
 */
export function printImage(io, imageId) {
  io.write(textEncoder.encode(`${ESC}_Ga=p,i=${imageId},q=2${ESC}\\\n`));
}
