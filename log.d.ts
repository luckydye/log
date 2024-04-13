/**
 * Logger builder
 */
export default function logger(): Logger;
/**
 * Creates a temporary logger and calls its assert method.
 * @param {any} condition
 * @param {string} [message]
 */
export function assert(condition: any, message?: string | undefined): void;
/**
 * Creates a temporary logger and calls its assert method with a TODO message.
 * @param {string} message
 */
export function todo(message: string): void;
export type Env = NodeJS.ProcessEnv;
export type LogObject = {
    ts: Date;
    level: 'error' | 'warn' | 'info' | 'debug';
    prefix?: string;
    location?: string | false;
    message?: string;
    args: any[];
};
declare class Logger {
    constructor(stdio?: (NodeJS.WriteStream & {
        fd: 2;
    }) | undefined);
    /**
     * Set prefix
     * @param {string} prefix
     */
    prefix(prefix: string): this;
    /**
     * Set tmestamp format
     * @param {boolean | "local" | "kitchen" | "iso" | "utc"} format
     */
    time(format: boolean | "local" | "kitchen" | "iso" | "utc"): this;
    /**
     * Enable stack tracing
     */
    trace(): this;
    /**
     * Enable stack tracing
     */
    json(): this;
    /**
     * Check log level
     * @private
     * @param {string} level
     * @returns {boolean}
     */
    private checkLevel;
    /**
     * Pipe logs to stream
     * @param {WritableStream} stream
     */
    pipeTo(stream: WritableStream): this;
    /**
     * Return formatted log string
     * @param {'error' | 'warn' | 'info' | 'debug'} level
     * @param {any[]} args
     */
    sprint: (level: 'error' | 'warn' | 'info' | 'debug', ...args: any[]) => string;
    /**
     * Log info
     * @param  {...any} args
     */
    info: (...args: any[]) => void;
    /**
     * Log error
     * @param  {...any} args
     */
    error: (...args: any[]) => void;
    /**
     * Log warning
     * @param  {...any} args
     */
    warn: (...args: any[]) => void;
    /**
     * Log debug
     * @param  {...any} args
     */
    debug: (...args: any[]) => void;
    /**
     * An assertion. Throws an error if condition is false.
     * @param {any} condition
     * @param {string} [message]
     */
    assert: (condition: any, message?: string | undefined) => void;
    #private;
}
export {};
