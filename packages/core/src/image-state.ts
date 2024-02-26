import { ValueOf } from ".";


/**
 * The state of image loading.
 */
export const ImageState = {
    IDLE: 0,
    LOADING: 1,
    LOADED: 2,
    ERROR: 3,
    EMPTY: 4,
} as const;

export type ImageStateType = ValueOf<typeof ImageState>;
