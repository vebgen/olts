import packageJson from '../package.json';

export const version = packageJson.version;

/**
 * Get the type of a const enum.
 */
export type ValueOf<T> = T[keyof T];
