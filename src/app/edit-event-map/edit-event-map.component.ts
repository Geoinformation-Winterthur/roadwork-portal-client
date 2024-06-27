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
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { MatSnackBar } from '@angular/material/snack-bar';
import { register } from 'ol/proj/proj4';
import { Projection, get as getProjection } from 'ol/proj.js';
import proj4 from 'proj4';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { EventFeature } from 'src/model/event-feature';
import { EventService } from 'src/services/event.service';

@Component({
  selector: 'app-edit-event-map',
  templateUrl: './edit-event-map.component.html',
  styleUrls: ['./edit-event-map.component.css']
})
export class EditEventMapComponent implements OnInit {

  @Input()
  eventFeat?: EventFeature;

  isInEditingMode: boolean = false;
  isEditingFinished: boolean = true;

  map: Map = new Map();

  userDrawSource: VectorSource = new VectorSource();
  loadSource: VectorSource = new VectorSource();
  polygonDraw?: Draw;

  private eventService: EventService;
  private snackBar: MatSnackBar;

  public constructor(snackBar: MatSnackBar,
    eventService: EventService) {
    this.eventService = eventService;
    this.snackBar = snackBar;
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

    const epsg2056Proj: Projection =  getProjection('EPSG:2056') as Projection;

    this.map = new Map({
      target: 'edit_event_map',
      layers: [
        new Tile({
          source: new TileWMS({
            url: 'http://wms.zh.ch/upwms',
            params: { 'LAYERS': 'upwms', 'TILED': true },
            serverType: 'mapserver',
          })
        }),
        new Tile({
          source: new TileWMS({
            url: 'http://wms.zh.ch/OGDCMS3ZH',
            params: { 'LAYERS': 'OGDCMS3ZH', 'TILED': true },
            serverType: 'mapserver',
          })
        }),
        loadLayer,
        userDrawLayer
      ],
      view: new View({
        projection: epsg2056Proj,
        center: [2697567.0, 1262079.0],
        zoom: 14
      })
    });

    this.resizeMap(null);

    this.polygonDraw = new Draw({
      source: this.userDrawSource,
      type: "Polygon",
    });

    this.addFeatureFinished = () => {
      if (this.userDrawSource.getState() === 'ready') {
        this.isInEditingMode = true;
        this.isEditingFinished = true;
        setTimeout(() => {
          if (this.polygonDraw !== undefined)
            this.map.removeInteraction(this.polygonDraw);
        }, 20);
        // this.endEditing();
      }
    }

    this.userDrawSource.on('addfeature', this.addFeatureFinished);

    this.loadGeometry(true);

  }

  loadGeometry(refreshExtent: boolean) {
    if (this.eventFeat !== undefined) {
      let needPoly: Polygon = RoadworkPolygon.convertToOlPoly(this.eventFeat.geometry);

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
    if (this.eventFeat != undefined) {
      let features = this.userDrawSource.getFeatures();
      let feature1 = features[0];
      let geom: Polygon = feature1.getGeometry() as Polygon;
      this.eventFeat.geometry = RoadworkPolygon.convertFromOlPolygon(geom);
      this.loadGeometry(false);
      if (this.eventFeat.properties.uuid) {
        this.eventService
          .updateEvent(this.eventFeat)
          .subscribe({
            next: (eventFeature) => {
              if (eventFeature) {
                  ErrorMessageEvaluation._evaluateErrorMessage(eventFeature);
                  if (eventFeature.errorMessage !== "") {
                    this.snackBar.open(eventFeature.errorMessage, "", {
                      duration: 4000
                    });
                  } else {
                    if (this.eventFeat) {
                      this.snackBar.open("Event ist gespeichert", "", {
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
    this.userDrawSource.clear();
    if (this.polygonDraw !== undefined) {
      this.map.addInteraction(this.polygonDraw);
      this.isInEditingMode = true;
      this.isEditingFinished = false;
    }
  }

  endEditing(status: string) {
    this.isInEditingMode = false;
    this.isEditingFinished = true;
    if (status == "save")
      this.sendGeometry();
    if (this.polygonDraw !== undefined)
      this.map.removeInteraction(this.polygonDraw);
    this.userDrawSource.clear();
  }

  showEditHelp() {
    alert("Klicken Sie in die Karte, um mit dem Zeichnen der Eventfläche zu beginnen. " +
      "Mit einem Doppelklick beenden Sie den Zeichenvorgang und schliessen die Fläche damit ab. " +
      "Der Doppelklick zum Abschliessen erfolgt dabei nicht auf den Startpunkt der Fläche.");
  }

  addFeatureFinished(event: any) {}

  private resizeMap(event: any) {
    let mapElement: HTMLElement | undefined;
    mapElement = document.getElementById("edit_event_map") as HTMLElement;
    mapElement.style.height = screen.availHeight / 2 + "px";
  }

  private setViewToPolyExtent(polyExtent: Extent) {
    if (polyExtent && polyExtent.length >= 0 && polyExtent[0] !== Infinity) {
      const epsg2056Proj: Projection =  getProjection('EPSG:2056') as Projection;
      let view = new View({
        projection: epsg2056Proj
      });
      view.fit(polyExtent);

      this.map.setView(view);
    }
  }

  refresh() {
    this.map.getLayers().changed();
  }

}
