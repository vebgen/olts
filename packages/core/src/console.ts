/**
 * The logging levels that the user may set.
 */
export type Level = 'info' | 'warn' | 'error' | 'none';


/**
 * Map between logging levels and their numeric values.
 */
const levels: Record<Level, number> = {
    /**
     * Log all messages.
     */
    info: 1,

    /**
     * Log warnings and errors.
     */
    warn: 2,

    /**
     * Log errors only.
     */
    error: 3,

    /**
     * Log no messages.
     */
    none: 4,
} as const;


/**
 * The current logging level.
 */
let level: number = levels.info;


/**
 * Set the logging level.
 *
 * By default, the level is set to 'info' and all messages will be logged.
 *
 * Set to 'warn' to only display warnings and errors.
 * Set to 'error' to only display errors.
 * Set to 'none' to silence all messages.
 *
 * @param l The new level.
 */
export function setLevel(l: Level) {
    if (levels[l] === undefined) {
        throw new Error(`Unknown logging level: ${l}`);
    }
    level = levels[l];
}


/**
 * Log an informative message.
 *
 * @param args Arguments to log (same as console.log).
 */
export function log(...args: any[]) {
    if (level > levels.info) {
        return;
    }
    console.log(...args); // eslint-disable-line no-console
}


/**
 * Log a warning message.
 *
 * @param args Arguments to log (same as console.warn).
 */
export function warn(...args: any[]) {
    if (level > levels.warn) {
        return;
    }
    console.warn(...args); // eslint-disable-line no-console
}


/**
 * Log an error message.
 *
 * @param args Arguments to log (same as console.error).
 */
export function error(...args: any[]) {
    if (level > levels.error) {
        return;
    }
    console.error(...args); // eslint-disable-line no-console
}
