
import {TileQueue} from '../TileQueue';
import type { State as ViewState } from '../view';
import {
    Transform,
} from '@olts/core/transform';
import {
    Extent,
} from '@olts/core/extent';
import { Size } from '@olts/core/size';
import { RBush } from '@olts/core/structs';
import { State as LayerState } from '../layer/Layer';
import { Map } from './map';


/**
 * A function that will be called when the render completes.
 */
export type PostRenderFunction = (map: Map, state?: FrameState) => any;


/**
 * State of the current frame. Only `pixelRatio`, `time` and `viewState` should
 * be used in applications.
 */
export interface FrameState {
    /**
     * The pixel ratio of the frame.
     */
    pixelRatio: number;

    /**
     * The time when rendering of the frame was requested.
     */
    time: number;

    /**
     * The state of the current view.
     */
    viewState: ViewState;

    /**
     * Animate.
     */
    animate: boolean;

    /**
     * Coordinate to pixel transform for the frame state.
     */
    coordinateToPixelTransform: Transform;

    /**
     * The declutter tree.
     */
    declutterTree: RBush<any> | null; // TODO type

    /**
     * Extent (in view projection coordinates).
     */
    extent: null | Extent;

    /**
     * Next extent during an animation series.
     */
    nextExtent?: Extent;

    /**
     * The index of the frame.
     */
    index: number;

    /**
     * The layer states array.
     */
    layerStatesArray: LayerState[];

    /**
     * The layer index.
     */
    layerIndex: number;

    /**
     * The pixel to coordinate transform for the frame state.
     */
    pixelToCoordinateTransform: Transform;

    /**
     * The list of functions to be executed after rendering.
     */
    postRenderFunctions: PostRenderFunction[];

    /**
     * The size of the frame.
     */
    size: Size;

    /**
     * The tile queue.
     */
    tileQueue: TileQueue;

    /**
     * The list of used tiles.
     */
    usedTiles: Record<string, Record<string, boolean>>;

    /**
     * The view hints.
     */
    viewHints: number[];

    /**
     * The list of wanted tiles.
     */
    wantedTiles: Record<string, Record<string, boolean>>;

    /**
     * The id of the map.
     */
    mapId: string;

    /**
     * Identifiers of previously rendered elements.
     */
    renderTargets: Record<string, boolean>;
}
