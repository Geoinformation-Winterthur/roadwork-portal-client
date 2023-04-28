/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import Map from 'ol/Map';
import Tile from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { Polygon } from 'ol/geom';

export class EditableMap extends Map {

  private displayableSource: VectorSource;
  private editableSource: VectorSource;

    constructor(htmlTarget: string){
        super();
        
        this.setTarget(htmlTarget);

        let uebersichtsPlanTile: Tile<TileWMS> = new Tile({
            source: new TileWMS({
              url: 'http://wms.zh.ch/upwms',
              params: { 'LAYERS': 'upwms', 'TILED': true },
              serverType: 'geoserver',
            })
          });
        this.addLayer(uebersichtsPlanTile);

        let zhMapsTile: Tile<TileWMS> = new Tile({
            source: new TileWMS({
              url: 'http://wms.zh.ch/OGDCMS3ZH',
              params: { 'LAYERS': 'OGDCMS3ZH', 'TILED': true },
              serverType: 'geoserver',
            })
          });
        this.addLayer(zhMapsTile);

        let displayLayerStyle: Style = new Style({
          fill: new Fill({
            color: 'rgba(160, 10, 10,0.4)'
          }),
          stroke: new Stroke({
            color: 'rgba(160, 10, 10,1.0)'
          })
        });

        this.displayableSource = new VectorSource({ wrapX: false });
        let displayLayer = new VectorLayer({
          source: this.displayableSource,
          style: displayLayerStyle
        });
        this.addLayer(displayLayer);

        let editableLayerStyle: Style = new Style({
          fill: new Fill({
            color: 'rgba(255, 0, 0,0.4)'
          }),
          stroke: new Stroke({
            color: 'rgba(255, 0, 0,1.0)'
          })
        });
    
        this.editableSource = new VectorSource({ wrapX: false });
        let editableLayer = new VectorLayer({
          source: this.editableSource,
          style: editableLayerStyle
        });
        this.addLayer(editableLayer);

        this.editableSource.on('addfeature', this.addFeatureFinished);

    }

    public getDisplayableSource(): VectorSource {
      return this.displayableSource;
    }

    public getEditableSource(): VectorSource {
      return this.editableSource;
    }

    public destroy(): void {
      this.editableSource.un('addfeature', this.addFeatureFinished);
    }

    private addFeatureFinished(event: any) {
      if (this.editableSource.getState() === 'ready') {
        this.sendGeometry();
        this.editableSource.clear();
        // this.endEditing();
      }
    }

    private sendGeometry(): void {
      let features = this.editableSource.getFeatures();
      let feature = features[0];
      let poly: Polygon = feature.getGeometry() as Polygon;
      // TODO ...
    }

}