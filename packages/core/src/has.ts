/**
 * The user agent string.
 */
const ua = (
    typeof navigator !== 'undefined' &&
    typeof navigator.userAgent !== 'undefined'
) ? navigator.userAgent.toLowerCase() : '';


/**
 * User agent string says we are dealing with Firefox as browser.
 */
export const FIREFOX: boolean = ua.includes('firefox');


/**
 * User agent string says we are dealing with Safari as browser.
 */
export const SAFARI: boolean = ua.includes('safari') && !ua.includes('chrom');


/**
 * After 15.4, WebGL renders to offscreen buffer, then back to on-screen,
 * are super broken (strobing, flashing, wrong textures).
 *
 * @see https://bugs.webkit.org/show_bug.cgi?id=237906
 */
export const SAFARI_BUG_237906: boolean = (
    SAFARI && (
        ua.includes('version/15.4') ||
        /cpu (os|iphone os) 15_4 like mac os x/.test(ua)
    )
);


/**
 * User agent string says we are dealing with a WebKit engine.
 */
export const WEBKIT: boolean = ua.includes('webkit') && !ua.includes('edge');


/**
 * User agent string says we are dealing with a Mac as platform.
 */
export const MAC: boolean = ua.includes('macintosh');


/**
 * The ratio between physical pixels and device-independent pixels
 * (dips) on the device (`window.devicePixelRatio`).
 * @api
 */
export const DEVICE_PIXEL_RATIO: number = (
    typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1
);


/**
 * The execution context is a worker with `OffscreenCanvas` available.
 */
export const WORKER_OFFSCREEN_CANVAS: boolean = (
    // @ts-ignore
    typeof WorkerGlobalScope !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    // @ts-ignore
    self instanceof WorkerGlobalScope //eslint-disable-line
);


/**
 * `Image.prototype.decode()` is supported.
 */
export const IMAGE_DECODE: boolean = (
    typeof Image !== 'undefined' && Image.prototype.decode
);


/**
 * `createImageBitmap()` is supported.
 */
export const CREATE_IMAGE_BITMAP: boolean = (
    typeof createImageBitmap === 'function'
);


/**
 * Passive event listeners enable developers to opt-in to better scroll
 * performance by eliminating the need for scrolling to block on touch
 * and wheel event listeners.
 *
 * Developers can annotate touch and wheel listeners with {passive: true}
 * to indicate that they will never invoke preventDefault.
 *
 * @see https://blog.chromium.org/2016/05/new-apis-to-help-developers-improve.html
 * @see https://stackoverflow.com/a/37721906/1742064
 * @see https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
 */
export const PASSIVE_EVENT_LISTENERS: boolean = (function () {
    let passive = false;
    try {
        const options = Object.defineProperty({}, 'passive', {
            get: function () {
                passive = true;
            },
        });

        // @ts-ignore Ignore invalid event type '_'
        window.addEventListener('_', null, options);
        // @ts-ignore Ignore invalid event type '_'
        window.removeEventListener('_', null, options);
    } catch (error) {
        // passive not supported
    }
    return passive;
})();
