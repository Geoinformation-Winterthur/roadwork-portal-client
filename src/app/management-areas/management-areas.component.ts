import { Component, Input, OnInit } from '@angular/core';
import Map from 'ol/Map';
import Feature from 'ol/Feature';
import { Polygon } from 'ol/geom';
import Tile from 'ol/layer/Tile';
import View from 'ol/View';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { MatSnackBar } from '@angular/material/snack-bar';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { ManagementAreaService } from 'src/services/management-area.service';

@Component({
  selector: 'app-management-areas',
  templateUrl: './management-areas.component.html',
  styleUrls: ['./management-areas.component.css']
})
export class ManagementAreasComponent implements OnInit {

  map: Map = new Map();

  loadSource: VectorSource = new VectorSource();

  private managementAreaService: ManagementAreaService;
  private snackBar: MatSnackBar;

  public constructor(snackBar: MatSnackBar,
    managementAreaService: ManagementAreaService) {
    this.managementAreaService = managementAreaService;
    this.snackBar = snackBar;
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    proj4.defs("EPSG:2056", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");
    register(proj4);
    this.initializeMap();
  }


  initializeMap() {
    let loadLayerStyle: Style = new Style({
      fill: new Fill({
        color: 'rgba(255, 145, 19,0.4)'
      }),
      stroke: new Stroke({
        color: 'rgba(255, 145, 19,1.0)'
      })
    });

    this.loadSource = new VectorSource({ wrapX: false });
    let loadLayer = new VectorLayer({
      source: this.loadSource,
      style: loadLayerStyle
    });

    this.map = new Map({
      target: 'management_areas_map',
      layers: [
        new Tile({
          source: new TileWMS({
            url: 'http://wms.zh.ch/upwms',
            params: { 'LAYERS': 'upwms', 'TILED': true },
            serverType: 'geoserver',
          })
        }),
        new Tile({
          source: new TileWMS({
            url: 'http://wms.zh.ch/OGDCMS3ZH',
            params: { 'LAYERS': 'OGDCMS3ZH', 'TILED': true },
            serverType: 'geoserver',
          })
        }),
        loadLayer
      ],
      view: new View({
        center: [972000.5, 6023000.72],
        zoom: 12
      })
    });

    this.loadGeometry();

  }

  loadGeometry() {

    this.managementAreaService
      .getManagementAreas()
      .subscribe({
        next: (managementAreasCollection) => {
          if (managementAreasCollection !== undefined) {
            this.loadSource.clear();
            for(let featureJson of managementAreasCollection.features)
            {
              let generalObject: any = featureJson;              
              let managementAreaPoly: Polygon = new Polygon(generalObject.geometry.coordinates);
              managementAreaPoly.transform("EPSG:2056", 'EPSG:3857');
              let managementArea: Feature = new Feature({
                geometry: managementAreaPoly
              });
              managementArea.setProperties(generalObject.properties, true);
              this.loadSource.addFeature(managementArea);
            }
            this.loadSource.changed();
          }
        },
        error: (error) => {
          this.snackBar.open("Baustellengeometrie konnte NICHT gespeichert werden", "", {
            duration: 4000,
          });
        }
      });

  }

}
