import { WORKER_OFFSCREEN_CANVAS } from "./has";

/**
 * Releases canvas memory to avoid exceeding memory limits in Safari.
 *
 * @param context Context.
 * @see https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/
 */
export function releaseCanvas(context: CanvasRenderingContext2D) {
    const canvas = context.canvas;
    canvas.width = 1;
    canvas.height = 1;
    context.clearRect(0, 0, 1, 1);
}


/**
 * Get the current computed width for the given element including margin,
 * padding and border.
 *
 * Equivalent to jQuery's `$(el).outerWidth(true)`.
 *
 * @param element The HTML element.
 * @return The width of the element.
 */
export function outerWidth(element: HTMLElement): number {
    let width = element.offsetWidth;
    const style = getComputedStyle(element);
    width += parseInt(style.marginLeft, 10) + parseInt(style.marginRight, 10);

    return width;
}


/**
 * Get the current computed height for the given element including margin,
 * padding and border.
 *
 * Equivalent to jQuery's `$(el).outerHeight(true)`.
 *
 * @param element Element.
 * @return The height.
 */
export function outerHeight(element: HTMLElement): number {
    let height = element.offsetHeight;
    const style = getComputedStyle(element);
    height += parseInt(style.marginTop, 10) + parseInt(style.marginBottom, 10);

    return height;
}


/**
 * Replaces a node in the DOM with another node.
 *
 * @param newNode Node to replace old node.
 * @param oldNode The node to be replaced.
 */
export function replaceNode(newNode: Node, oldNode: Node) {
    const parent = oldNode.parentNode;
    if (parent) {
        parent.replaceChild(newNode, oldNode);
    } else {
        throw new Error('The old node has no parent.');
    }
}


/**
 * Removes a node from the DOM tree.
 *
 * @param node The node to remove.
 * @return The node that was removed or null if the node was not found.
 */
export function removeNode(node: Node): Node | null {
    return node && node.parentNode ? node.parentNode.removeChild(node) : null;
}


/**
 * Removes all children of a node from the DOM.
 *
 * @param node The node to remove the children from.
 */
export function removeChildren(node: Node) {
    while (node.lastChild) {
        node.removeChild(node.lastChild);
    }
}


/**
 * Transform the children of a parent node so they match the
 * provided list of children.
 *
 * This function aims to efficiently remove, add, and reorder child nodes while
 * maintaining a simple implementation (it is not guaranteed to minimize DOM
 * operations).
 *
 * @param node The parent node whose children need reworking.
 * @param children The desired children.
 */
export function replaceChildren(node: Node, children: Node[]) {
    const oldChildren = node.childNodes;

    for (let i = 0; true; ++i) {
        const oldChild = oldChildren[i];
        const newChild = children[i];

        // check if our work is done
        if (!oldChild && !newChild) {
            break;
        }

        // check if children match
        if (oldChild === newChild) {
            continue;
        }

        // check if a new child needs to be added
        if (!oldChild) {
            node.appendChild(newChild);
            continue;
        }

        // check if an old child needs to be removed
        if (!newChild) {
            node.removeChild(oldChild);
            --i;
            continue;
        }

        // reorder
        node.insertBefore(newChild, oldChild);
    }
}

// TODO: this is here so that we avoid a dependency onn the canvas module.

/**
 * Create an html canvas element and returns its 2d context.
 *
 * @param width Canvas width.
 * @param height Canvas height.
 * @param canvasPool Canvas pool to take existing canvas from.
 * @param settings CanvasRenderingContext2DSettings
 * @return The context.
 */
export function createCanvasContext2D(
    width?: number,
    height?: number,
    canvasPool?: Array<HTMLCanvasElement>,
    settings?: CanvasRenderingContext2DSettings
): CanvasRenderingContext2D {
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    if (canvasPool && canvasPool.length) {
        canvas = canvasPool.shift() as HTMLCanvasElement;
    } else if (WORKER_OFFSCREEN_CANVAS) {
        canvas = new OffscreenCanvas(width || 300, height || 300);
    } else {
        canvas = document.createElement('canvas');
    }
    if (width) {
        canvas.width = width;
    }
    if (height) {
        canvas.height = height;
    }

    //FIXME Allow OffscreenCanvasRenderingContext2D as return type
    return canvas.getContext('2d', settings) as CanvasRenderingContext2D;
}

let sharedCanvasContext: CanvasRenderingContext2D;

/**
 * @return Shared canvas context.
 */
export function getSharedCanvasContext2D(): CanvasRenderingContext2D {
    if (!sharedCanvasContext) {
        sharedCanvasContext = createCanvasContext2D(1, 1);
    }
    return sharedCanvasContext;
}
