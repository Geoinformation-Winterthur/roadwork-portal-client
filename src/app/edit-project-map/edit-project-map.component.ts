import { Component, OnInit } from '@angular/core';
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
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { register } from 'ol/proj/proj4';
import { RoadWorkProjectService } from 'src/services/roadwork_project.service';
import proj4 from 'proj4';

@Component({
  selector: 'app-edit-project-map',
  templateUrl: './edit-project-map.component.html',
  styleUrls: ['./edit-project-map.component.css']
})
export class EditProjectMapComponent implements OnInit {

  constructionProjectId: number = -1;

  map: Map = new Map();

  userDrawSource: VectorSource = new VectorSource();
  loadSource: VectorSource = new VectorSource();

  private roadWorkProjectService: RoadWorkProjectService;
  private activatedRoute: ActivatedRoute;
  private snackBar: MatSnackBar

  public constructor(activatedRoute: ActivatedRoute, snackBar: MatSnackBar,
    roadWorkProjectService: RoadWorkProjectService) {
    this.roadWorkProjectService = roadWorkProjectService
    this.activatedRoute = activatedRoute;
    this.snackBar = snackBar;
  }

  ngOnInit() {
    this.activatedRoute.params
      .subscribe(params => {
        let constProjId: number = parseInt(params['id']);
        this.constructionProjectId = constProjId;
      }, error => {
      });

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
      target: 'content_map',
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

    function newLineInteraction(map: Map, vectorSource: VectorSource) {
      let draw = new Draw({
        source: vectorSource,
        type: "Polygon",
      });
      map.addInteraction(draw);
    }

    this.userDrawSource.on('addfeature', (event) => {
      if (this.userDrawSource.getState() === 'ready') {
        this.sendGeometry();
        this.userDrawSource.clear();
      }
    });

    newLineInteraction(this.map, this.userDrawSource);

    this.loadGeometry(true);

  }

  loadGeometry(refreshExtent: boolean) {

    this.roadWorkProjectService.getGeometry(this.constructionProjectId).subscribe(
      coordinates => {
        let coordinatesArray: number[] = coordinates as number[];

        let i: number = 1;
        let polyCoords = [];
        for (i; i < coordinatesArray.length; i = i + 2) {
          let coords: number[] = [];
          coords[0] = coordinatesArray[i - 1];
          coords[1] = coordinatesArray[i];
          polyCoords.push(coords);
        }

        let ahaPoly: Polygon = new Polygon([polyCoords]);
        ahaPoly.transform("EPSG:2056", 'EPSG:3857');


        let testFeature: Feature = new Feature({
          type: "Feature",
          name: "testFeature",
          id: 231243,
          geometry: ahaPoly
        });

        this.loadSource.clear();
        this.loadSource.addFeature(testFeature);
        this.loadSource.changed();

        if (refreshExtent) {
          let polyExtent: Extent = ahaPoly.getExtent();
          this.setViewToPolyExtent(polyExtent);
        }

      }, error => {
      }
    );
  }

  sendGeometry() {
    let features = this.userDrawSource.getFeatures();
    let feature1 = features[0];
    let geom1: Polygon = feature1.getGeometry() as Polygon;
    let geom2: Polygon = geom1.clone();
    geom2.transform('EPSG:3857', "EPSG:2056");
    this.roadWorkProjectService
      .postGeometry(this.constructionProjectId, geom2.getFlatCoordinates())
      .subscribe(
        success => {
          this.snackBar.open("Baustellengeometrie ist gespeichert", "", {
            duration: 4000,
          });
          this.loadGeometry(false);
        }, error => {
          this.snackBar.open("Baustellengeometrie konnte NICHT gespeichert werden", "", {
            duration: 4000,
          });
        });

  }

  private setViewToPolyExtent(polyExtent: Extent) {
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
