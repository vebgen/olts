import { Extent } from '@olts/core/extent';

import { BuilderType, SerializableInstructions } from '../canvas';
import Builder from './builder';
import ImageBuilder from './image-builder';
import LineStringBuilder from './line-string-builder';
import PolygonBuilder from './polygon-builder';
import TextBuilder from './text-builder';
import VectorContext from '../vector-context';


/**
 *
 */
const BATCH_CONSTRUCTORS: Record<BuilderType, typeof Builder> = {
    Circle: PolygonBuilder,
    Default: Builder,
    Image: ImageBuilder,
    LineString: LineStringBuilder,
    Polygon: PolygonBuilder,
    Text: TextBuilder,
} as const;


type BuildersByZIndex = Record<string, Record<BuilderType, Builder>>;


/**
 *
 */
export class BuilderGroup {
    /**
     * Tolerance
     */
    private tolerance_: number;

    /**
     * Max extent
     */
    private maxExtent_: Extent;

    /**
     * Pixel ratio
     */
    private pixelRatio_: number;

    /**
     * Resolution
     */
    private resolution_: number;

    /**
     * Builders by Z index
     */
    private buildersByZIndex_: BuildersByZIndex;

    /**
     * @param tolerance Tolerance.
     * @param maxExtent Max extent.
     * @param resolution Resolution.
     * @param pixelRatio Pixel ratio.
     */
    constructor(
        tolerance: number,
        maxExtent: Extent,
        resolution: number,
        pixelRatio: number
    ) {
        this.tolerance_ = tolerance;
        this.maxExtent_ = maxExtent;
        this.pixelRatio_ = pixelRatio;
        this.resolution_ = resolution;
        this.buildersByZIndex_ = {};
    }

    /**
     * @return The serializable instructions
     */
    finish(): Record<string, Record<BuilderType, SerializableInstructions>> {
        const builderInstructions: Record<
            string,
            Record<BuilderType, SerializableInstructions>
        > = {};
        for (const zKey in this.buildersByZIndex_) {
            builderInstructions[zKey] = builderInstructions[zKey] || {};
            const builders = this.buildersByZIndex_[zKey];
            for (const builderKey in builders) {
                const builderInstruction =
                    builders[builderKey as BuilderType].finish();
                builderInstructions[zKey][builderKey as BuilderType] =
                    builderInstruction;
            }
        }
        return builderInstructions;
    }

    /**
     * @param zIndex Z index.
     * @param builderType Replay type.
     * @return Replay.
     */
    getBuilder(
        zIndex: number | undefined,
        builderType: BuilderType
    ): VectorContext {
        const zIndexKey = zIndex !== undefined ? zIndex.toString() : '0';
        let replays: Record<BuilderType, Builder> =
            this.buildersByZIndex_[zIndexKey];
        if (replays === undefined) {
            replays = {} as Record<BuilderType, Builder>;
            this.buildersByZIndex_[zIndexKey] = replays;
        }
        let replay = replays[builderType];
        if (replay === undefined) {
            const Constructor = BATCH_CONSTRUCTORS[builderType];
            replay = new Constructor(
                this.tolerance_,
                this.maxExtent_,
                this.resolution_,
                this.pixelRatio_,
            );
            replays[builderType] = replay;
        }
        return replay as unknown as VectorContext;
    }
}


export default BuilderGroup;
