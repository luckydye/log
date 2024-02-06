/**
 * Logger builder
 */
export default function logger(): Logger;
export type LogObject = {
    ts: Date;
    level: 'error' | 'warn' | 'info' | 'debug';
    prefix?: string;
    location?: string | false;
    message?: string;
    args: any[];
};
declare class Logger {
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
     * Pipe logs to stream
     * @param {WritableStream} stream
     */
    pipeTo(stream: WritableStream): this;
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
    #private;
}
/**
 * Format log level
 * @param {string} lvl
 */
declare function level(lvl: string): string;
export {};
