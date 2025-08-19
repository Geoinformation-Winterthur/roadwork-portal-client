import { Injectable } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import { fromLonLat } from 'ol/proj';
import BaseLayer from 'ol/layer/Base';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { Fill, Stroke, Style } from 'ol/style';
import html2canvas from 'html2canvas';
import {
  createEmpty as extentCreateEmpty,
  extend as extentExtend,
  isEmpty as extentIsEmpty,
  createOrUpdateFromCoordinate as extentFromCoordinate,
} from 'ol/extent';
import type { Extent } from 'ol/extent';

// ✅ proj4 for LV95 (EPSG:2056)
import proj4 from 'proj4';
import { register as registerProj } from 'ol/proj/proj4';
import TileWMS from 'ol/source/TileWMS';
import Tile from 'ol/layer/Tile';

proj4.defs(
  'EPSG:2056',
  '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 ' +
    '+x_0=2600000 +y_0=1200000 +ellps=bessel ' +
    '+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs'
);
registerProj(proj4);

@Injectable({ providedIn: 'root' })
export class MapCaptureService {
  /** Ensure the linear ring is closed (first equals last). */
  private ensureClosedRing(coords: [number, number][]): [number, number][] {
    if (coords.length < 3) return coords;
    const [fx, fy] = coords[0];
    const [lx, ly] = coords[coords.length - 1];
    return fx === lx && fy === ly ? coords : [...coords, [fx, fy]];
  }

  /**
   * Build a VectorLayer from EPSG:2056 **polygons** (each polygon is one ring) and transform to EPSG:3857.
   * Returns both the layer and its extent (for fitting the view later).
   */
  private layerFrom2056Polygons(
    polygons2056: Array<Array<{ x: number; y: number }>>,
    style: Style
  ): { layer: VectorLayer<VectorSource>; extent: Extent | null } {
    if (!polygons2056 || polygons2056.length === 0) {
      return { layer: new VectorLayer({ source: new VectorSource() }), extent: null };
    }

    const features: Feature[] = [];
    let unionExtent: Extent = extentCreateEmpty();

    for (const ring of polygons2056) {
      if (!ring || ring.length < 3) continue;

      let ring2056: [number, number][] = ring.map((c) => [c.x, c.y]);
      ring2056 = this.ensureClosedRing(ring2056);

      const geom = new Polygon([ring2056]); // geometry in EPSG:2056
      geom.transform('EPSG:2056', 'EPSG:3857'); // transform to view projection

      const feat = new Feature({ geometry: geom });
      features.push(feat);

      // merge extent as we go to avoid re-scanning later
      const gext = geom.getExtent();
      if (gext) {
        if (extentIsEmpty(unionExtent)) {
          unionExtent = gext.slice() as Extent;
        } else {
          unionExtent = extentExtend(unionExtent, gext);
        }
      }
    }

    const source = new VectorSource({ features });
    const layer = new VectorLayer({ source, style });

    // Fallback if union stayed empty but we have features (shouldn't happen normally)
    const finalExtent =
      !extentIsEmpty(unionExtent) ? unionExtent : features.length ? source.getExtent() : null;

    return { layer, extent: finalExtent };
  }

  /**
   * Renders an OpenLayers map off-screen and returns a PNG data URL.
   * Works without showing a visible map component to the user.
   *
   * @param featuresGeoJson      Optional GeoJSON FeatureCollection (assumed EPSG:4326).
   * @param width                Output image width in pixels.
   * @param height               Output image height in pixels.
   * @param centerLonLat         Map center [lon, lat]; ignored if fitToFeatures is true and we have features.
   * @param zoom                 Initial zoom level.
   * @param fitToFeatures        If true and features exist, the view will fit to their combined extent.
   * @param roadworkNeeds        Optional array of polygons (EPSG:2056) as [[{x,y},...], ...].
   * @param roadworkActivities   Optional array of polygons (EPSG:2056) as [[{x,y},...], ...].
   */
  async captureMapOffscreen(
    featuresGeoJson?: any,
    width: number = 1024,
    height: number = 768,
    centerLonLat: [number, number] = [8.719, 47.499],
    zoom: number = 13,
    fitToFeatures: boolean = true,
    roadworkNeeds?: Array<Array<{ x: number; y: number }>>,
    roadworkActivities?: Array<Array<{ x: number; y: number }>>
  ): Promise<string> {
    // Create hidden container outside of viewport
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-99999px';
    container.style.top = '0';
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    // Base layer (ensure CORS if you plan to export canvases)
    const baseLayer = new TileLayer({ source: new OSM() });
    const baseLayer2 = new Tile({
          source: new TileWMS({
            url: 'http://wms.zh.ch/upwms',
            params: { 'LAYERS': 'upwms', 'TILED': true },
            serverType: 'mapserver',
             crossOrigin: 'anonymous'
          })
        });
    const baseLayer3 = new Tile({
          source: new TileWMS({
            url: 'http://wms.zh.ch/OGDCMS3ZH',
            params: { 'LAYERS': 'OGDCMS3ZH', 'TILED': true },
            serverType: 'mapserver',
            crossOrigin: 'anonymous'
          })
        });

    // Optional vector layer from GeoJSON (assumed EPSG:4326 per GeoJSON spec)
    let geoJsonLayer: VectorLayer<any> | undefined;
    let geoJsonExtent: Extent | null = null;

    if (featuresGeoJson) {
      const vectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(featuresGeoJson, {
          dataProjection: 'EPSG:4326', // ✅ CRS of GeoJSON
          featureProjection: 'EPSG:3857',
        }),
      });
      geoJsonLayer = new VectorLayer({
        source: vectorSource,
        style: new Style({
          stroke: new Stroke({ color: '#0acdf0ff', width: 2, lineDash: [6, 6] }),
          fill: new Fill({ color: 'rgba(25,118,210,0.3)' }),          
        }),
      });
      geoJsonExtent = vectorSource.getExtent();
    }

    // Optional vector layer from EPSG:2056 **needs** polygons (red)
    let needsLayer: VectorLayer<any> | undefined;
    let needsExtent: Extent | null = null;
    if (roadworkNeeds && roadworkNeeds.length) {
      const { layer, extent } = this.layerFrom2056Polygons(
        roadworkNeeds,
        new Style({
          stroke: new Stroke({ color: 'rgba(85, 53, 229, 1)', width: 2, lineDash: [6, 6] }),
          fill: new Fill({ color: 'rgba(208, 231, 124, 0.3)' }),
        })
      );
      needsLayer = layer;
      needsExtent = extent;
    }

    // Optional vector layer from EPSG:2056 **activities** polygons (green)
    let activitiesLayer: VectorLayer<any> | undefined;
    let activitiesExtent: Extent | null = null;
    if (roadworkActivities && roadworkActivities.length) {
      const { layer, extent } = this.layerFrom2056Polygons(
        roadworkActivities,
        new Style({
          stroke: new Stroke({ color: '#2e7d32', width: 2 }),
          fill: new Fill({ color: 'rgba(46,125,50,0.15)' }),
        })
      );
      activitiesLayer = layer;
      activitiesExtent = extent;
    }

    // View configuration
    const view = new View({
      center: fromLonLat(centerLonLat),
      zoom,
    });

    // Build layer list
    const layers: BaseLayer[] = [baseLayer3];
    if (geoJsonLayer) layers.push(geoJsonLayer);
    if (needsLayer) layers.push(needsLayer);
    if (activitiesLayer) layers.push(activitiesLayer);

    // Initialize off-screen map
    const map = new Map({
      target: container,
      layers,
      view,
      controls: [], // clean export
    });

    // Fit to the combined extent of all vector inputs if requested
    if (fitToFeatures && (geoJsonExtent || needsExtent || activitiesExtent)) {
      let combined = extentCreateEmpty();

      if (geoJsonExtent && !extentIsEmpty(geoJsonExtent)) {
        combined = extentExtend(combined, geoJsonExtent);
      }
      if (needsExtent && !extentIsEmpty(needsExtent)) {
        combined = extentExtend(combined, needsExtent);
      }
      if (activitiesExtent && !extentIsEmpty(activitiesExtent)) {
        combined = extentExtend(combined, activitiesExtent);
      }

      if (!extentIsEmpty(combined)) {
        view.fit(combined, {
          size: [width, height],
          padding: [30, 30, 30, 30],
          maxZoom: 17,
        });
      }
    }

    // Wait for the first complete render
    await new Promise<void>((resolve) => {
      map.once('rendercomplete', () => resolve());
      map.renderSync();
    });

    // Compose image via html2canvas (captures stacked OL canvases)
    const canvas = await html2canvas(container, {
      scale: 2, // higher DPI export
      useCORS: false, // set true only if tiles/fonts are CORS-enabled
    });
    const dataUrl = canvas.toDataURL('image/png');

    // Cleanup
    map.setTarget(null as any);
    document.body.removeChild(container);

    return dataUrl;
  }
}
