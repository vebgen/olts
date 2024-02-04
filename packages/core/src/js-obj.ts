
/**
 * Removes all properties from an object.
 * 
 * @param object The object to clear.
 */
export function clear(object: Record<string, unknown>) {
    for (const property in object) {
        delete object[property];
    }
}

/**
 * Determine if an object has any properties.
 *
 * @param object The object to check.
 * @return The object is empty.
 */
export function isEmpty(object: Record<string, unknown>): boolean {
    let property;
    for (property in object) {
        return false;
    }
    return !property;
}
