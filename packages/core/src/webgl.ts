/**
 * Constants taken from goog.webgl
 */
import { SAFARI_BUG_237906 } from './has';


/**
 * Used by {@link WebGLHelper} for buffers containing vertices data, such as
 * position, color, texture coordinate, etc.
 *
 * These vertices are then referenced by an index buffer
 * to be drawn on screen (see {@link ELEMENT_ARRAY_BUFFER}).
 *
 * @api
 */
export const ARRAY_BUFFER: number = 0x8892;


/**
 * Used by {@link WebGLHelper} for buffers containing indices data.
 *
 * Index buffers are essentially lists of references to vertices defined in a
 * vertex buffer (see {@link ARRAY_BUFFER}), and define the primitives
 * (triangles) to be drawn.
 *
 * @api
 */
export const ELEMENT_ARRAY_BUFFER: number = 0x8893;


/**
 * Used by {@link WebGLArrayBuffer}.
 *
 * @api
 */
export const STREAM_DRAW: number = 0x88e0;


/**
 * Used by {@link WebGLArrayBuffer}.
 *
 * @api
 */
export const STATIC_DRAW: number = 0x88e4;


/**
 * Used by {@link WebGLArrayBuffer}.
 *
 * @api
 */
export const DYNAMIC_DRAW: number = 0x88e8;


/**
 *
 */
export const UNSIGNED_BYTE: number = 0x1401;


/**
 *
 */
export const UNSIGNED_SHORT: number = 0x1403;


/**
 *
 */
export const UNSIGNED_INT: number = 0x1405;


/**
 *
 */
export const FLOAT: number = 0x1406;


// end of goog.webgl constants


/**
 * The list of supported WebGL context names.
 *
 * This list is used to find the supported WebGL context name.
 */
const CONTEXT_IDS: string[] = [
    'experimental-webgl', 'webgl', 'webkit-3d', 'moz-webgl'
] as const;


/**
 * Returns a WebGL rendering context.
 *
 * @param canvas Canvas.
 * @param attributes Attributes.
 * @return WebGL rendering context.
 */
export function getContext(
    canvas: HTMLCanvasElement, attributes?: Record<string, any>
): WebGLRenderingContext | null {
    attributes = Object.assign(
        {
            preserveDrawingBuffer: true,
            // https://bugs.webkit.org/show_bug.cgi?id=237906
            antialias: SAFARI_BUG_237906 ? false : true,
        },
        attributes,
    );
    const ii = CONTEXT_IDS.length;
    for (let i = 0; i < ii; ++i) {
        try {
            const context = canvas.getContext(CONTEXT_IDS[i], attributes);
            if (context) {
                return context as WebGLRenderingContext;
            }
        } catch (e) {
            // pass
        }
    }
    return null;
}


/**
 * Caches the result of {@link getSupportedExtensions()}.
 */
let supportedExtensions: string[] | null = null;


/**
 *
 * @return List of supported WebGL extensions.
 */
export function getSupportedExtensions(): string[] | null {
    if (!supportedExtensions) {
        const canvas = document.createElement('canvas');
        const gl = getContext(canvas);
        if (gl) {
            supportedExtensions = gl.getSupportedExtensions();
        }
    }
    return supportedExtensions;
}
