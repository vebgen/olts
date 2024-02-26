

import LRUCache from './structs/LRUCache';
import { getIntersection } from '@olts/core/extent';

export { default as BingMaps } from './source/BingMaps';
export { default as CartoDB } from './source/CartoDB';
export { default as Cluster } from './source/Cluster';
export { default as DataTile } from './source/DataTile';
export { default as GeoTIFF } from './source/GeoTIFF';
export { default as IIIF } from './source/IIIF';
export { default as Image } from './source/Image';
export { default as ImageArcGISRest } from './source/ImageArcGISRest';
export { default as ImageCanvas } from './source/ImageCanvas';
export { default as ImageMapGuide } from './source/ImageMapGuide';
export { default as ImageStatic } from './source/ImageStatic';
export { default as ImageWMS } from './source/ImageWMS';
export { default as OGCMapTile } from './source/OGCMapTile';
export { default as OGCVectorTile } from './source/OGCVectorTile';
export { default as OSM } from './source/OSM';
export { default as Raster } from './source/Raster';
export { default as Source } from './source/Source';
export { default as StadiaMaps } from './source/StadiaMaps';
export { default as Tile } from './source/Tile';
export { default as TileArcGISRest } from './source/TileArcGISRest';
export { default as TileDebug } from './source/TileDebug';
export { default as TileImage } from './source/TileImage';
export { default as TileJSON } from './source/TileJSON';
export { default as TileWMS } from './source/TileWMS';
export { default as UrlTile } from './source/UrlTile';
export { default as UTFGrid } from './source/UTFGrid';
export { default as Vector } from './source/Vector';
export { default as VectorTile } from './source/VectorTile';
export { default as WMTS } from './source/WMTS';
export { default as XYZ } from './source/XYZ';
export { default as Zoomify } from './source/Zoomify';
export { createLoader as createWMSLoader } from './source/wms';
export { createLoader as createArcGISRestLoader } from './source/arcgisRest';
export { createLoader as createStaticLoader } from './source/static';
export { createLoader as createMapGuideLoader } from './source/mapguide';

/**
 * Creates a sources function from a tile grid. This function can be used as value for the
 * `sources` property of the {@link module:ol/layer/Layer~Layer} subclasses that support it.
 * @param {TileGrid} tileGrid Tile grid.
 * @param {function(TileCoord): import("./source/Source").default} factory Source factory.
 * This function takes a {@link TileCoord} as argument and is expected to return a
 * {@link module:ol/source/Source~Source}. **Note**: The returned sources should have a tile grid with
 * a limited set of resolutions, matching the resolution range of a single zoom level of the pyramid
 * `tileGrid` that `sourcesFromTileGrid` was called with.
 * @return {function(Extent, number): Array<import("./source/Source").default>} Sources function.
 * @api
 */
export function sourcesFromTileGrid(tileGrid: TileGrid, factory: (arg0: TileCoord) => import("./source/Source").default): (arg0: Extent, arg1: number) => Array<import("./source/Source").default> {
    const sourceCache = new LRUCache(32);
    const tileGridExtent = tileGrid.getExtent();
    return function (extent, resolution) {
        sourceCache.expireCache();
        if (tileGridExtent) {
            extent = getIntersection(tileGridExtent, extent);
        }
        const z = tileGrid.getZForResolution(resolution);
        const wantedSources = [];
        tileGrid.forEachTileCoord(extent, z, (tileCoord) => {
            const key = tileCoord.toString();
            if (!sourceCache.containsKey(key)) {
                const source = factory(tileCoord);
                sourceCache.set(key, source);
            }
            wantedSources.push(sourceCache.get(key));
        });
        return wantedSources;
    };
}
