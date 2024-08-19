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
import proj4 from 'proj4';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { ManagementAreaService } from 'src/services/management-area.service';

@Component({
  selector: 'app-edit-activity-map',
  templateUrl: './edit-activity-map.component.html',
  styleUrls: ['./edit-activity-map.component.css']
})
export class EditActivityMapComponent implements OnInit {

  @Input()
  roadWorkActivityFeat?: RoadWorkActivityFeature;

  chosenYear?: number;

  isInEditingMode: boolean = false;
  isEditingFinished: boolean = true;

  map: Map = new Map();

  userDrawSource: VectorSource = new VectorSource();
  roadWorkActivitySource: VectorSource = new VectorSource();
  roadWorkNeedSource: VectorSource = new VectorSource();
  polygonDraw?: Draw;

  public needsOfActivityService: NeedsOfActivityService;
  needsOnMap: RoadWorkNeedFeature[] = [];

  private roadWorkActivityService: RoadWorkActivityService;
  private snackBar: MatSnackBar;
  private roadWorkNeedService: RoadWorkNeedService;
  private managementAreaService: ManagementAreaService;

  public constructor(snackBar: MatSnackBar,
    roadWorkActivityService: RoadWorkActivityService,
    needsOfActivityService: NeedsOfActivityService,
    roadWorkNeedService: RoadWorkNeedService,
    managementAreaService: ManagementAreaService) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.managementAreaService = managementAreaService;
    this.snackBar = snackBar;
  }

  ngOnInit() {
    addEventListener("resize", this.resizeMap);
  }

  ngAfterViewInit() {
    proj4.defs("EPSG:2056", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");
    register(proj4);
    this.initializeMap();
    this.resizeMap(null);
  }

  ngOnDestroy() {
    removeEventListener("resize", this.resizeMap);
    removeEventListener("addfeature", this.addFeatureFinished);
    // this.map.destroy();
  }

  initializeMap() {

    let roadWorkActivityLayerStyle: Style = new Style({
      fill: new Fill({
        color: 'rgba(147, 227, 255, 0.1)'
      }),
      stroke: new Stroke({
        color: 'rgba(147, 227, 255, 1.0)',
        width: 2
      })
    });

    this.roadWorkActivitySource = new VectorSource({ wrapX: false });
    let roadWorkActivityLayer = new VectorLayer({
      source: this.roadWorkActivitySource,
      style: roadWorkActivityLayerStyle
    });

    function roadWorkNeedLayerStyleFunc(feature: any, resolution: any) {
      let roadWorkNeedLayerStyle: Style = new Style({
        fill: new Fill({
          color: 'rgba(149, 35, 210, 0.1)'
        }),
        stroke: new Stroke({
          color: "rgba(149, 35, 210, 1.0)",
          width: 2,
          lineDash: feature.get('status') === "requirement" ? [6, 6] : []
        })
      });
      return [roadWorkNeedLayerStyle];
    }

    this.roadWorkNeedSource = new VectorSource({ wrapX: false });
    let roadWorkNeedLayer = new VectorLayer({
      source: this.roadWorkNeedSource,
      style: roadWorkNeedLayerStyleFunc
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

    // this.map = new EditableMap("edit_activity_map");

    this.map = new Map({
      target: 'edit_activity_map',
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
        roadWorkActivityLayer,
        userDrawLayer,
        roadWorkNeedLayer
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

    this._reloadRoadworkNeeds(true);
  }

  onChangeYear() {
    this._reloadRoadworkNeeds(false);
  }

  sendGeometry() {
    if (this.roadWorkActivityFeat != undefined) {
      let features = this.userDrawSource.getFeatures();
      let feature1 = features[0];
      let geom1: Polygon = feature1.getGeometry() as Polygon;
      let geom2: Polygon = geom1.clone();
      geom2.transform('EPSG:3857', "EPSG:2056");
      this.roadWorkActivityFeat.geometry = RoadworkPolygon.convertFromOlPolygon(geom2);
      this._putRoadworksOnMap(false);
      if (this.roadWorkActivityFeat.properties.uuid) {

        this.managementAreaService.getIntersectingManagementArea(this.roadWorkActivityFeat.geometry)
          .subscribe({
            next: (managementArea) => {
              if (managementArea) {
                this.roadWorkActivityService
                  .updateRoadWorkActivity(this.roadWorkActivityFeat)
                  .subscribe({
                    next: (roadWorkActivityFeature) => {
                      if (roadWorkActivityFeature) {
                        ErrorMessageEvaluation._evaluateErrorMessage(roadWorkActivityFeature);
                        if (roadWorkActivityFeature.errorMessage !== "") {
                          this.snackBar.open(roadWorkActivityFeature.errorMessage, "", {
                            duration: 4000
                          });
                        } else {
                          if (this.roadWorkActivityFeat) {
                            this.roadWorkActivityFeat = roadWorkActivityFeature;
                            if (roadWorkActivityFeature.properties.roadWorkNeedsUuids.length !== 0) {
                              this.roadWorkNeedService.getRoadWorkNeeds(roadWorkActivityFeature.properties.roadWorkNeedsUuids)
                                .subscribe({
                                  next: (roadWorkNeeds) => {
                                    let assignedRoadWorkNeeds: RoadWorkNeedFeature[] = [];
                                    let registeredRoadWorkNeeds: RoadWorkNeedFeature[] = [];
                                    for (let roadWorkNeed of roadWorkNeeds) {
                                      if (roadWorkNeed.properties.activityRelationType === "assignedneed") {
                                        assignedRoadWorkNeeds.push(roadWorkNeed);
                                      } else if (roadWorkNeed.properties.activityRelationType === "registeredneed") {
                                        registeredRoadWorkNeeds.push(roadWorkNeed);
                                      }
                                    }
                                    this.needsOfActivityService.assignedRoadWorkNeeds = assignedRoadWorkNeeds;
                                    this.needsOfActivityService.registeredRoadWorkNeeds = registeredRoadWorkNeeds;
                                  },
                                  error: (error) => {
                                  }
                                });
                            }
                            this.needsOfActivityService.updateIntersectingRoadWorkNeeds(roadWorkActivityFeature.properties.uuid);
                            this.snackBar.open("Vorhabengeometrie ist gespeichert", "", {
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
    alert("Klicken Sie in die Karte, um mit dem Zeichnen der Projektfläche zu beginnen. " +
      "Mit einem Doppelklick beenden Sie den Zeichenvorgang und schliessen die Fläche damit ab. " +
      "Der Doppelklick zum Abschliessen erfolgt dabei nicht auf den Startpunkt der Fläche.");
  }

  private _reloadRoadworkNeeds(refreshExtent: boolean) {
    this.roadWorkNeedService.getRoadWorkNeeds([], this.chosenYear,
      "", "", false, undefined, undefined, ["requirement"])
      .subscribe({
        next: (roadWorkNeeds) => {
          this.needsOnMap = roadWorkNeeds;
          this._putRoadworksOnMap(refreshExtent);
        },
        error: (error) => {
        }
      });
  }

  private _putRoadworksOnMap(refreshExtent: boolean) {

    this.roadWorkNeedSource.clear();
    let i: number = 0;
    for (let roadWorkNeedFeature of this.needsOnMap) {
      let needPoly: Polygon = RoadworkPolygon.convertToOlPoly(roadWorkNeedFeature.geometry);
      needPoly.transform("EPSG:2056", 'EPSG:3857');

      let needFeature: Feature = new Feature({
        type: "Feature",
        name: "Roadwork need",
        id: i++,
        geometry: needPoly
      });

      needFeature.set("status", roadWorkNeedFeature.properties.status);

      this.roadWorkNeedSource.addFeature(needFeature);
    }
    this.roadWorkNeedSource.changed();

    if (this.roadWorkActivityFeat !== undefined) {
      let activityPoly: Polygon = RoadworkPolygon.convertToOlPoly(this.roadWorkActivityFeat.geometry);

      activityPoly.transform("EPSG:2056", 'EPSG:3857');

      let activityFeature: Feature = new Feature({
        type: "Feature",
        name: "Roadwork activity",
        id: 1,
        geometry: activityPoly
      });

      this.roadWorkActivitySource.clear();
      this.roadWorkActivitySource.addFeature(activityFeature);

      this.roadWorkActivitySource.changed();

      if (refreshExtent) {
        let polyExtent: Extent = activityPoly.getExtent();
        this.setViewToPolyExtent(polyExtent);
      }
    }
  }

  private addFeatureFinished(event: any) { }

  private resizeMap(event: any) {
    let mapElement: HTMLElement | undefined;
    mapElement = document.getElementById("edit_activity_map") as HTMLElement;
    mapElement.style.height = screen.availHeight / 2 + "px";
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
