/**
 * Appends query parameters to a URI.
 *
 * Note that the parameters already present in the URI are not parsed and are
 * not merged with the new parameters. This function simply appends the new
 * parameters to the end of the URI.
 *
 * @param uri The original URI, which may already have query data.
 * @param params An object where keys are URI-encoded parameter keys,
 *     and the values are arbitrary types or arrays.
 * @return The new URI.
 */
export function appendParams(
    uri: string,
    params: Record<string, any>
): string {
    const keyParams:string[] = [];

    // Skip any null or undefined parameter values
    Object.keys(params).forEach(function (k) {
        if (params[k] !== null && params[k] !== undefined) {
            keyParams.push(k + '=' + encodeURIComponent(params[k]));
        }
    });

    // Concatenate the incoming parameters.
    const qs = keyParams.join('&');

    // remove any trailing ? or &
    uri = uri.replace(/[?&]$/, '');

    // append ? or & depending on whether uri has existing parameters
    uri += uri.includes('?') ? '&' : '?';

    // Append the parameters to the URI.
    return uri + qs;
}
