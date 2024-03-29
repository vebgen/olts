# The `@olts/core/proj` module

The `proj` module stores:

- a list of {@link Projection}
  objects, one for each projection supported by the application
- a list of transform functions needed to convert coordinates in one projection
  into another.

The static functions are the methods used to maintain these.
Each transform function can handle not only simple coordinate pairs, but also
large arrays of coordinates such as vector geometries.

When loaded, the library adds projection objects for EPSG:4326 (WGS84
geographic coordinates) and EPSG:3857 (Web or Spherical Mercator, as used
for example by Bing Maps or OpenStreetMap), together with the relevant
transform functions.

Additional transforms may be added by using the <http://proj4js.org/>
library (version 2.2 or later). You can use the full build supplied by
Proj4js, or create a custom build to support those projections you need; see
the Proj4js website for how to do this. You also need the Proj4js definitions
for the required projections. These definitions can be obtained from
<https://epsg.io/>, and are a JS function, so can be loaded in a script
tag (as in the examples) or pasted into your application.

After all required projection definitions are added to proj4's registry (by
using `proj4.defs()`), simply call `register(proj4)` from the `ol/proj/proj4`
package. Existing transforms are not changed by this function. See
`examples/wms-image-custom-proj` for an example of this.

Additional projection definitions can be registered with `proj4.defs()` any
time. Just make sure to call `register(proj4)` again; for example, with
user-supplied data where you don't know in advance what projections are needed,
you can initially load minimal support and then load whichever are requested.

Note that Proj4js does not support projection extents. If you want to add
one for creating default tile grids, you can add it after the Projection
object has been created with `setExtent`, for example,
`get('EPSG:1234').setExtent(extent)`.

In addition to Proj4js support, any transform functions can be added with
`addCoordinateTransforms`. To use this, you must first create a `Projection`
object for the new projection and add it with `addProjection`. You can then add
the forward and inverse functions with `addCoordinateTransforms`. See
`examples/wms-custom-proj` for an example of this.

Note that if no transforms are needed and you only need to define the
projection, just add a `Projection` with `addProjection`. See
examples/wms-no-proj for an example of this.
