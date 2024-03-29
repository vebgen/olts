import Attribution from './Attribution';
import Collection from '../Collection';
import Rotate from './Rotate';
import Zoom from './Zoom';
import { Control } from './Control';

/**
 * @typedef {Object} DefaultsOptions
 * @property {boolean} [attribution=true] Include
 * {@link module:ol/control/Attribution~Attribution}.
 * @property {import("./Attribution").Options} [attributionOptions]
 * Options for {@link module:ol/control/Attribution~Attribution}.
 * @property {boolean} [rotate=true] Include
 * {@link module:ol/control/Rotate~Rotate}.
 * @property {import("./Rotate").Options} [rotateOptions] Options
 * for {@link module:ol/control/Rotate~Rotate}.
 * @property {boolean} [zoom] Include {@link module:ol/control/Zoom~Zoom}.
 * @property {import("./Zoom").Options} [zoomOptions] Options for
 * {@link module:ol/control/Zoom~Zoom}.
 */
export interface DefaultsOptions {
    attribution?: boolean;
    attributionOptions?: AttributionOptions;
    rotate?: boolean;
    rotateOptions?: RotateOptions;
    zoom?: boolean;
    zoomOptions?: ZoomOptions;
}


/**
 * Set of controls included in maps by default. Unless configured otherwise,
 * this returns a collection containing an instance of each of the following
 * controls:
 * * {@link module:ol/control/Zoom~Zoom}
 * * {@link module:ol/control/Rotate~Rotate}
 * * {@link module:ol/control/Attribution~Attribution}
 *
 * @param {DefaultsOptions} [options] Options for the default controls.
 * @return {Collection<import("./Control").default>} A collection of controls
 * to be used with the {@link module:ol/Map~Map} constructor's `controls` option.
 * @api
 */
export function defaults(options?: DefaultsOptions): Collection<Control> {
    options = options ? options : {};

    /** @type {Collection<import("./Control").default>} */
    const controls: Collection<import("./Control").default> = new Collection();

    const zoomControl = options.zoom !== undefined ? options.zoom : true;
    if (zoomControl) {
        controls.push(new Zoom(options.zoomOptions));
    }

    const rotateControl = options.rotate !== undefined ? options.rotate : true;
    if (rotateControl) {
        controls.push(new Rotate(options.rotateOptions));
    }

    const attributionControl =
        options.attribution !== undefined ? options.attribution : true;
    if (attributionControl) {
        controls.push(new Attribution(options.attributionOptions));
    }

    return controls;
}
