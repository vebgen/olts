export { Projection } from './projection';

export {
    fromEPSG4326,
    toEPSG4326,
} from './epsg3857';


export {
    clear as clearProjectionsCache,
    get as getProjectionFromCache,
    add as addProjectionToCache,
} from './list';


export {
    isRegistered,
    register,
    unregister,
    fromEPSGCode,
    epsgLookupMapTiler,
    getEPSGLookup,
    setEPSGLookup,
} from './proj4';


export type {
    ProjectionLike,
    TransformFunction,
    CoordTransform,
} from './support';
export {
    get as getProjection,
    disableCoordinateWarning,
    cloneTransform,
    identityTransform,
    addProjection,
    addProjections,
    getPointResolution,
    addEquivalentProjections,
    addEquivalentTransforms,
    clearAllProjections,
    createProjection,
    createTransformFromCoordinateTransform,
    addCoordinateTransforms,
    fromLonLat,
    toLonLat,
    equivalent,
    getTransformFromProjections,
    getTransform as getProjTransform,
    transform as transformProj,
    transformExtent,
    transformWithProjections,
    setUserProjection,
    clearUserProjection,
    getUserProjection,
    useGeographic,
    toUserCoordinate,
    fromUserCoordinate,
    toUserExtent,
    fromUserExtent,
    toUserResolution,
    fromUserResolution,
    createSafeCoordinateTransform,
} from './support';


export {
    get as getTransform,
    add as addTransform,
    remove as removeTransform,
    createMat4,
    mat4FromTransform,
} from './transform';


export {
    Units,
    fromCode as unitsFromCode,
    METERS_PER_UNIT,
    getMPU
} from './units';
