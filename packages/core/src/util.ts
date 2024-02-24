/**
 * Placeholder for functions.
 * @todo Is this still needed?
 */
export function abstract(): never {
    throw new Error('Unimplemented abstract method.');
}


/**
 * Counter for getUid.
 * @private
 */
let uidCounter_: number = 0;


/**
 * Gets the unique ID for an object. If the object does not yet have a unique
 * ID, a new one will be generated and returned.
 *
 * This mutates the object so that further calls with the same object as a
 * parameter returns the same value. Unique IDs are generated as a strictly
 * increasing sequence. Adapted from goog.getUid.
 *
 * @param obj The object to get the unique ID for.
 * @return The unique ID for the object.
 * @api
 */
export function getUid(obj: any): string {
    return (obj as any).ol_uid || ((obj as any).ol_uid = String(++uidCounter_));
}


/**
 * OpenLayers version.
 */
export const VERSION: string = 'latest';
