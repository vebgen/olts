import { getUid } from './util';


/**
 * Simple JSONP helper. Supports error callbacks and a custom callback param.
 *
 * @param url Request url. A 'callback' query parameter will be appended.
 * @param callback Callback on success.
 * @param errBack Callback on error. Will be called when no JSONP is executed
 *     after 10 seconds.
 * @param callbackParam Custom query parameter for the JSONP callback to be
 *     added to the URI. Default is 'callback'.
 */
export function jsonp<T = any>(
    url: string,
    callback: (data: T) => void,
    errBack?: () => void,
    callbackParam?: string
) {
    // Prepare the script.
    const script = document.createElement('script');
    const key = 'olc_' + getUid(callback);
    script.async = true;
    script.src = (
        url +
        (url.includes('?') ? '&' : '?') +
        (callbackParam || 'callback') + '=' + key
    );

    // Called on unmount (both success and error).
    function cleanup() {
        delete window[key as any];
        script.parentNode!.removeChild(script);
    }

    // Script timeout.
    const timer = setTimeout(function () {
        cleanup();
        if (errBack) {
            errBack();
        }
    }, 10000);

    // @ts-ignore
    window[key as any] = function (data: T) {
        clearTimeout(timer);
        cleanup();
        callback(data);
    };
    document.head.appendChild(script);
}


/**
 * A custom error class that saves the response from a XMLHttpRequest.
 *
 * This is thrown if the server replies with an unexpected status code.
 */
export class ResponseError extends Error {
    /**
     * The XHR object.
     */
    public response: XMLHttpRequest;

    /**
     * @param response The XHR object.
     */
    constructor(response: XMLHttpRequest) {
        const message = 'Unexpected response status: ' + response.status;
        super(message);
        this.name = 'ResponseError';
        this.response = response;
    }
}


/**
 * A custom error class that saves the XHR object.
 *
 * This is thrown in response to a failed request (i.e. network error).
 */
export class ClientError extends Error {
    /**
     * The XHR object.
     */
    client: XMLHttpRequest;

    /**
     * @param client The XHR object.
     */
    constructor(client: XMLHttpRequest) {
        super('Failed to issue request');
        this.name = 'ClientError';
        this.client = client;
    }
}


/**
 * @param url The URL.
 * @return A promise that resolves to the JSON response.
 */
export function getJSON<T = Record<any, any>>(url: string): Promise<T> {
    return new Promise(function (resolve, reject) {
        /**
         * @param event The load event.
         */
        function onLoad(
            this: XMLHttpRequest, event: ProgressEvent<XMLHttpRequest>
        ) {
            const client = event.target!;

            // status will be 0 for file:// urls
            if (
                !client.status ||
                (client.status >= 200 && client.status < 300)
            ) {
                let data: T;
                try {
                    data = JSON.parse(client.responseText);
                } catch (err) {
                    reject(new Error(
                        'Error parsing response text as JSON: ' +
                        (err as Error).message
                    ));
                    return;
                }
                resolve(data);
                return;
            }

            reject(new ResponseError(client));
        }

        /**
         * @param event The error event.
         */
        function onError(
            this: XMLHttpRequest, event: ProgressEvent<XMLHttpRequest>
        ) {
            reject(new ClientError(event.target!));
        }

        const client = new XMLHttpRequest();
        client.addEventListener('load', onLoad as any);
        client.addEventListener('error', onError as any);
        client.open('GET', url);
        client.setRequestHeader('Accept', 'application/json');
        client.send();
    });
}


/**
 * Compute a full URL from a base and a potentially relative URL.
 *
 * @param base The base URL. If `url` already has a protocol this is ignored.
 * @param url The potentially relative URL.
 * @return The full URL.
 */
export function resolveUrl(base: string, url: string): string {
    if (url.includes('://')) {
        return url;
    }
    return new URL(url, base).href;
}


/**
 * Keep the replaced implementation here.
 */
let originalXHR: typeof XMLHttpRequest;


/**
 * Monkey patch the global XMLHttpRequest object.
 */
export function overrideXHR(xhr: typeof XMLHttpRequest) {
    if (typeof XMLHttpRequest !== 'undefined') {
        originalXHR = XMLHttpRequest;
    }
    global.XMLHttpRequest = xhr;
}


/**
 * Restore the original implementation of the XMLHttpRequest.
 */
export function restoreXHR() {
    if (originalXHR) {
        global.XMLHttpRequest = originalXHR;
    }
}
