
import { modulo } from '@olts/core/math';
import { hash as tileCoordHash } from './tile-coord';

/**
 * @param {string} template Template.
 * @param {TileGrid} tileGrid Tile grid.
 * @return {import("./Tile").UrlFunction} Tile URL function.
 */
export function createFromTemplate(template: string, tileGrid: TileGrid): import("./Tile").UrlFunction {
    const zRegEx = /\{z\}/g;
    const xRegEx = /\{x\}/g;
    const yRegEx = /\{y\}/g;
    const dashYRegEx = /\{-y\}/g;
    return (
        /**
         * @param {TileCoord} tileCoord Tile Coordinate.
         * @param {number} pixelRatio Pixel ratio.
         * @param {Projection} projection Projection.
         * @return {string|undefined} Tile URL.
         */
        function (tileCoord: TileCoord, pixelRatio: number, projection: Projection): string | undefined {
            if (!tileCoord) {
                return undefined;
            }
            return template
                .replace(zRegEx, tileCoord[0].toString())
                .replace(xRegEx, tileCoord[1].toString())
                .replace(yRegEx, tileCoord[2].toString())
                .replace(dashYRegEx, function () {
                    const z = tileCoord[0];
                    const range = tileGrid.getFullTileRange(z);
                    if (!range) {
                        throw new Error(
                            'The {-y} placeholder requires a tile grid with extent',
                        );
                    }
                    const y = range.getHeight() - tileCoord[2] - 1;
                    return y.toString();
                });
        }
    );
}

/**
 * @param {Array<string>} templates Templates.
 * @param {TileGrid} tileGrid Tile grid.
 * @return {import("./Tile").UrlFunction} Tile URL function.
 */
export function createFromTemplates(templates: Array<string>, tileGrid: TileGrid): import("./Tile").UrlFunction {
    const len = templates.length;
    const tileUrlFunctions = new Array(len);
    for (let i = 0; i < len; ++i) {
        tileUrlFunctions[i] = createFromTemplate(templates[i], tileGrid);
    }
    return createFromTileUrlFunctions(tileUrlFunctions);
}

/**
 * @param {Array<import("./Tile").UrlFunction>} tileUrlFunctions Tile URL Functions.
 * @return {import("./Tile").UrlFunction} Tile URL function.
 */
export function createFromTileUrlFunctions(tileUrlFunctions: Array<import("./Tile").UrlFunction>): import("./Tile").UrlFunction {
    if (tileUrlFunctions.length === 1) {
        return tileUrlFunctions[0];
    }
    return (
        /**
         * @param {TileCoord} tileCoord Tile Coordinate.
         * @param {number} pixelRatio Pixel ratio.
         * @param {Projection} projection Projection.
         * @return {string|undefined} Tile URL.
         */
        function (tileCoord: TileCoord, pixelRatio: number, projection: Projection): string | undefined {
            if (!tileCoord) {
                return undefined;
            }
            const h = tileCoordHash(tileCoord);
            const index = modulo(h, tileUrlFunctions.length);
            return tileUrlFunctions[index](tileCoord, pixelRatio, projection);
        }
    );
}

/**
 * @param {TileCoord} tileCoord Tile coordinate.
 * @param {number} pixelRatio Pixel ratio.
 * @param {Projection} projection Projection.
 * @return {string|undefined} Tile URL.
 */
export function nullTileUrlFunction(tileCoord: TileCoord, pixelRatio: number, projection: Projection): string | undefined {
    return undefined;
}

/**
 * @param {string} url URL.
 * @return {Array<string>} Array of urls.
 */
export function expandUrl(url: string): Array<string> {
    const urls = [];
    let match = /\{([a-z])-([a-z])\}/.exec(url);
    if (match) {
        // char range
        const startCharCode = match[1].charCodeAt(0);
        const stopCharCode = match[2].charCodeAt(0);
        let charCode;
        for (charCode = startCharCode; charCode <= stopCharCode; ++charCode) {
            urls.push(url.replace(match[0], String.fromCharCode(charCode)));
        }
        return urls;
    }
    match = /\{(\d+)-(\d+)\}/.exec(url);
    if (match) {
        // number range
        const stop = parseInt(match[2], 10);
        for (let i = parseInt(match[1], 10); i <= stop; i++) {
            urls.push(url.replace(match[0], i.toString()));
        }
        return urls;
    }
    urls.push(url);
    return urls;
}
