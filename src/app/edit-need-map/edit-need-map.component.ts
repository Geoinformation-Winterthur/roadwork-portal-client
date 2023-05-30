/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, Input, OnInit } from '@angular/core';
import Map from 'ol/Map';
import Feature from 'ol/Feature';
import { Polygon } from 'ol/geom';
import Tile from 'ol/layer/Tile';
import View from 'ol/View';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import Draw from 'ol/interaction/Draw';
import VectorLayer from 'ol/layer/Vector';
import { Extent } from 'ol/extent';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { MatSnackBar } from '@angular/material/snack-bar';
import { register } from 'ol/proj/proj4';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import proj4 from 'proj4';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { ManagementAreaFeature } from 'src/model/management-area-feature';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';

@Component({
  selector: 'app-edit-need-map',
  templateUrl: './edit-need-map.component.html',
  styleUrls: ['./edit-need-map.component.css']
})
export class EditNeedMapComponent implements OnInit {

  @Input()
  roadWorkNeedFeat?: RoadWorkNeedFeature;

  isInEditingMode: boolean = false;

  map: Map = new Map();

  userDrawSource: VectorSource = new VectorSource();
  loadSource: VectorSource = new VectorSource();
  polygonDraw?: Draw;

  private roadWorkNeedService: RoadWorkNeedService;
  private snackBar: MatSnackBar;

  public constructor(snackBar: MatSnackBar,
    roadWorkNeedService: RoadWorkNeedService) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.snackBar = snackBar;
    setTimeout(() => {
      this.resizeMap(null);
    }, 20);
  }

  ngOnInit() {
    addEventListener("resize", this.resizeMap);
  }

  ngAfterViewInit() {
    proj4.defs("EPSG:2056", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");
    register(proj4);
    this.initializeMap();
  }

  ngOnDestroy() {
    removeEventListener("resize", this.resizeMap);
    removeEventListener("addfeature", this.addFeatureFinished);
  }

  initializeMap() {

    let loadLayerStyle: Style = new Style({
      fill: new Fill({
        color: 'rgba(160, 10, 10,0.4)'
      }),
      stroke: new Stroke({
        color: 'rgba(160, 10, 10,1.0)'
      })
    });

    this.loadSource = new VectorSource({ wrapX: false });
    let loadLayer = new VectorLayer({
      source: this.loadSource,
      style: loadLayerStyle
    });

    let userDrawLayerStyle: Style = new Style({
      fill: new Fill({
        color: 'rgba(255, 0, 0,0.4)'
      }),
      stroke: new Stroke({
        color: 'rgba(255, 0, 0,1.0)'
      })
    });

    this.userDrawSource = new VectorSource({ wrapX: false });
    let userDrawLayer = new VectorLayer({
      source: this.userDrawSource,
      style: userDrawLayerStyle
    });

    this.map = new Map({
      target: 'edit_need_map',
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
        loadLayer,
        userDrawLayer
      ],
      view: new View({
        center: [972000.5, 6023000.72],
        zoom: 14
      })
    });

    this.polygonDraw = new Draw({
      source: this.userDrawSource,
      type: "Polygon",
    });

    this.addFeatureFinished = (event) => {
      if (this.userDrawSource.getState() === 'ready') {
        this.sendGeometry();
        this.userDrawSource.clear();
        // this.endEditing();
      }
    }

    this.userDrawSource.on('addfeature', this.addFeatureFinished);

    this.loadGeometry(true);

  }

  loadGeometry(refreshExtent: boolean) {
    if (this.roadWorkNeedFeat !== undefined) {
      let needPoly: Polygon = RoadworkPolygon.convertToOlPoly(this.roadWorkNeedFeat.geometry);
      needPoly.transform("EPSG:2056", 'EPSG:3857');

      let testFeature: Feature = new Feature({
        type: "Feature",
        name: "testFeature",
        id: 231243,
        geometry: needPoly
      });

      this.loadSource.clear();
      this.loadSource.addFeature(testFeature);
      this.loadSource.changed();

      if (refreshExtent) {
        let polyExtent: Extent = needPoly.getExtent();
        this.setViewToPolyExtent(polyExtent);
      }
    }
  }

  sendGeometry() {
    if (this.roadWorkNeedFeat != undefined) {
      let features = this.userDrawSource.getFeatures();
      let feature1 = features[0];
      let geom1: Polygon = feature1.getGeometry() as Polygon;
      let geom2: Polygon = geom1.clone();
      geom2.transform('EPSG:3857', "EPSG:2056");
      this.roadWorkNeedFeat.geometry = RoadworkPolygon.convertFromOlPolygon(geom2);
      this.loadGeometry(false);
      if (this.roadWorkNeedFeat.properties.uuid) {
        if (!this.roadWorkNeedFeat.properties.managementarea) {
          this.roadWorkNeedFeat.properties.managementarea = new ManagementAreaFeature();
        }
        this.roadWorkNeedFeat.properties.managementarea.geometry = RoadworkPolygon.convertFromOlPolygon(geom2);

        this.roadWorkNeedService
          .updateRoadWorkNeed(this.roadWorkNeedFeat)
          .subscribe({
            next: (roadWorkNeedFeature) => {
              if (roadWorkNeedFeature) {
                  ErrorMessageEvaluation._evaluateErrorMessage(roadWorkNeedFeature);
                  if (roadWorkNeedFeature.errorMessage !== "") {
                    this.snackBar.open(roadWorkNeedFeature.errorMessage, "", {
                      duration: 4000
                    });
                  } else {
                    if (this.roadWorkNeedFeat) {
                      this.roadWorkNeedFeat.properties.managementarea = roadWorkNeedFeature.properties.managementarea;
                      this.snackBar.open("Baustellengeometrie ist gespeichert", "", {
                        duration: 4000,
                      });
                    }
                  }
                }
              },
              error: (error) => {
              }
            });
      }
    }
  }

  startEditing() {
    if (this.polygonDraw !== undefined) {
      this.map.addInteraction(this.polygonDraw);
      this.isInEditingMode = true;
    }
  }

  endEditing() {
    if (this.polygonDraw !== undefined) {
      this.map.removeInteraction(this.polygonDraw);
      this.isInEditingMode = false;
    }
  }

  showEditHelp() {
    alert("Klicken Sie in die Karte, um mit dem Zeichnen der Projektfläche zu beginnen. " +
      "Mit einem Doppelklick beenden Sie den Zeichenvorgang und schliessen die Fläche damit ab. " +
      "Der Doppelklick zum Abschliessen erfolgt dabei nicht auf den Startpunkt der Fläche.");
  }

  addFeatureFinished(event: any) {}

  private resizeMap(event: any) {
    let mapElement: HTMLElement = document.getElementById("edit_need_map") as HTMLElement;
    let mapElementRect: DOMRect = mapElement.getBoundingClientRect();
    let topCoord: number = Math.round(mapElementRect.top);
    let mapHeight: number = window.innerHeight - (topCoord + 70);
    if (window.innerWidth / mapHeight > 3.5) {
      mapHeight = window.innerWidth / 3.5;
    }
    mapElement.style.height = mapHeight + "px";
  }

  private setViewToPolyExtent(polyExtent: Extent) {
    if (polyExtent && polyExtent.length >= 0 && polyExtent[0] !== Infinity) {
      // extent: [minx, miny, maxx, maxy]
      let extentCenterX: number = polyExtent[0] + ((polyExtent[2] - polyExtent[0]) / 2.0);
      let extentCenterY: number = polyExtent[1] + ((polyExtent[3] - polyExtent[1]) / 2.0);
      var extentCenter: Point = new Point([extentCenterX, extentCenterY]);

      let view = new View({
        center: extentCenter.getCoordinates(),
        zoom: 15
      });
      view.fit(polyExtent);

      this.map.setView(view);
    }
  }

  refresh() {
    this.map.getLayers().changed();
  }

}
