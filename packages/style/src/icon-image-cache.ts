import { ImageState } from '@olts/core/image-state';
import { Color, asArray } from '@olts/core/color';
import { getSharedCanvasContext2D } from '@olts/core/dom';

import { IconImage } from './icon-image';


/**
 * Singleton class. Available through {@linkIconImageCache.shared}.
 */
class IconImageCache {
    /**
     *
     */
    private cache_: Record<string, IconImage> = {};

    /**
     *
     */
    private patternCache_: Record<string, CanvasPattern> = {};

    /**
     *
     */
    private cacheSize_: number = 0;

    /**
     *
     */
    private maxCacheSize_: number = 32;

    /**
     * Remove everything from the cache.
     */
    clear() {
        this.cache_ = {};
        this.patternCache_ = {};
        this.cacheSize_ = 0;
    }

    /**
     * @return Can expire cache.
     */
    canExpireCache(): boolean {
        return this.cacheSize_ > this.maxCacheSize_;
    }

    /**
     *
     */
    expire() {
        if (this.canExpireCache()) {
            let i = 0;
            for (const key in this.cache_) {
                const iconImage = this.cache_[key];
                if ((i++ & 3) === 0 && !iconImage.hasListener()) {
                    delete this.cache_[key];
                    delete this.patternCache_[key];
                    --this.cacheSize_;
                }
            }
        }
    }

    /**
     * @param src Src.
     * @param crossOrigin Cross origin.
     * @param color Color.
     * @return Icon image.
     */
    get(
        src: string,
        crossOrigin: string | null,
        color: Color | string | null
    ): IconImage | null {
        const key = getCacheKey(src, crossOrigin, color);
        return key in this.cache_ ? this.cache_[key] : null;
    }

    /**
     * @param src Src.
     * @param IconImage crossOrigin Cross origin.
     * @param color Color.
     * @return Icon image.
     */
    getPattern(
        src: string,
        crossOrigin: string | null,
        color: Color | string | null
    ): CanvasPattern | null {
        const key = getCacheKey(src, crossOrigin, color);
        return key in this.patternCache_ ? this.patternCache_[key] : null;
    }

    /**
     * @param src Src.
     * @param IconImage crossOrigin Cross origin.
     * @param color Color.
     * @param iconImage Icon image.
     * @param pattern Also cache a `'repeat'` pattern with this `iconImage`.
     */
    set(
        src: string,
        crossOrigin: string | null,
        color: Color | string | null,
        iconImage: IconImage,
        pattern?: boolean
    ) {
        const key = getCacheKey(src, crossOrigin, color);
        const update = key in this.cache_;
        this.cache_[key] = iconImage;
        if (pattern) {
            if (iconImage.getImageState() === ImageState.IDLE) {
                iconImage.load();
            }
            if (iconImage.getImageState() === ImageState.LOADING) {
                iconImage.ready().then(() => {
                    const ctx = getSharedCanvasContext2D();
                    this.patternCache_[key] = ctx.createPattern(
                        iconImage.getImage(1),
                        'repeat',
                    )!;
                });
            } else {
                const ctx = getSharedCanvasContext2D();
                this.patternCache_[key] = ctx.createPattern(
                    iconImage.getImage(1),
                    'repeat',
                )!;
            }
        }
        if (!update) {
            ++this.cacheSize_;
        }
    }

    /**
     * Set the cache size of the icon cache.
     *
     * Default is `32`.
     *
     * Change this value when your map uses more than 32 different icon images
     * and you are not caching icon styles on the application level.
     *
     * @param maxCacheSize Cache max size.
     * @api
     */
    setSize(maxCacheSize: number) {
        this.maxCacheSize_ = maxCacheSize;
        this.expire();
    }
}


/**
 * @param src Src.
 * @param IconImage crossOrigin Cross origin.
 * @param color Color.
 * @return Cache key.
 */
export function getCacheKey(
    src: string,
    crossOrigin: string | null,
    color: Color | string | null
): string {
    const colorString = color ? asArray(color) : 'null';
    return crossOrigin + ':' + src + ':' + colorString;
}


export default IconImageCache;


/**
 * The {@link IconImageCache} for {@link Icon} images.
 *
 * @api
 */
export const shared = new IconImageCache();
