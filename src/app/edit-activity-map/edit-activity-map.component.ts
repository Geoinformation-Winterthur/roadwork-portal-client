/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Geoinformation Winterthur. All rights reserved.
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
import proj4 from 'proj4';
import { Projection, get as getProjection } from 'ol/proj.js';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { ManagementAreaService } from 'src/services/management-area.service';
import { Address } from 'src/model/address';
import { AddressService } from 'src/services/address.service';

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

  addresses: Address[] = [];
  addressSearchString: string = "";

  userDrawSource: VectorSource = new VectorSource();
  roadWorkActivitySource: VectorSource = new VectorSource();
  roadWorkNeedSource: VectorSource = new VectorSource();
  polygonDraw?: Draw;

  public needsOfActivityService: NeedsOfActivityService;
  needsOnMap: RoadWorkNeedFeature[] = [];

  private roadWorkActivityService: RoadWorkActivityService;
  private addressService: AddressService;
  private snackBar: MatSnackBar;
  private roadWorkNeedService: RoadWorkNeedService;
  private managementAreaService: ManagementAreaService;

  public constructor(snackBar: MatSnackBar,
    roadWorkActivityService: RoadWorkActivityService,
    needsOfActivityService: NeedsOfActivityService,
    roadWorkNeedService: RoadWorkNeedService,
    managementAreaService: ManagementAreaService,
    addressService: AddressService) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.managementAreaService = managementAreaService;
    this.addressService = addressService;
    this.snackBar = snackBar;
  }

  ngOnInit() {
    addEventListener("resize", this.resizeMap);
  }

  ngAfterViewInit() {
    proj4.defs("EPSG:2056", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");
    register(proj4);
    this.initializeMap();
    this.resizeMap();
  }

  ngOnDestroy() {
    removeEventListener("resize", this.resizeMap);
    removeEventListener("addfeature", this.addFeatureFinished);
    // this.map.destroy();
  }

  initializeMap() {

    function isRoadWorkActFinished(feature: any): boolean {
      let status: string = feature.get('status');
      let dateSksReal = feature.get('dateSksReal');
      if (status === 'coordinated' && dateSksReal)
        return true;
      return false;
    }

    function roadWorkActivityLayerStyleFunc(feature: any) {
      let roadWorkActivityLayerStyle: Style = new Style({
        fill: new Fill({
          color: 'rgba(147, 227, 255, 0.1)'
        }),
        stroke: new Stroke({
          color: "rgba(147, 227, 255, 1.0)",
          width: 2,
          lineDash: isRoadWorkActFinished(feature) ? [] : [6, 6]
        })
      });
      return [roadWorkActivityLayerStyle];
    }

    this.roadWorkActivitySource = new VectorSource({ wrapX: false });
    let roadWorkActivityLayer = new VectorLayer({
      source: this.roadWorkActivitySource,
      style: roadWorkActivityLayerStyleFunc
    });

    function roadWorkNeedLayerStyleFunc(feature: any) {
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

    const epsg2056Proj: Projection = getProjection('EPSG:2056') as Projection;

    this.map = new Map({
      target: 'edit_activity_map',
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
        roadWorkNeedLayer,
        roadWorkActivityLayer,
        userDrawLayer
      ],
      view: new View({
        projection: epsg2056Proj,
        center: [2697567.0, 1262079.0],
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
      let geom: Polygon = feature1.getGeometry() as Polygon;
      this.roadWorkActivityFeat.geometry = RoadworkPolygon.convertFromOlPolygon(geom);
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

  refreshAddressList() {
    this.addressService.getAddressList(this.addressSearchString)
      .subscribe({
        next: (addressList) => {
          if (addressList)
            this.addresses = addressList;
        },
        error: (error) => {
        }
      });
  }

  zoomToAddress() {
    let chosenAddress: Address = new Address();
    for (let address of this.addresses) {
      if (address.address == this.addressSearchString) {
        chosenAddress = address;
        break;
      }
    }
    if (chosenAddress.x && chosenAddress.y) {
      this.map.getView().setCenter([chosenAddress.x, chosenAddress.y]);
      this.map.getView().setZoom(18);
    }
  }

  showEditHelp() {
    alert("Klicken Sie in die Karte, um mit dem Zeichnen der Projektfläche zu beginnen. " +
      "Mit einem Doppelklick beenden Sie den Zeichenvorgang und schliessen die Fläche damit ab. " +
      "Der Doppelklick zum Abschliessen erfolgt dabei nicht auf den Startpunkt der Fläche.");
  }

  private _reloadRoadworkNeeds(refreshExtent: boolean) {
    this.roadWorkNeedSource.clear();
    this.roadWorkNeedService.getRoadWorkNeeds([], undefined,
      "", "", false, undefined, undefined, ["requirement"])
      .subscribe({
        next: (roadWorkNeeds) => {
          this.needsOnMap = roadWorkNeeds;
          this._putRoadworksOnMap(refreshExtent);
        },
        error: (error) => {
        }
      });
    if (this.roadWorkActivityFeat && !this.roadWorkActivityFeat.properties.dateSksReal) {
      this.roadWorkNeedService.getRoadWorkNeeds(this.roadWorkActivityFeat.properties.roadWorkNeedsUuids)
        .subscribe({
          next: (roadWorkNeeds) => {
            this.needsOnMap = roadWorkNeeds;
            this._putRoadworksOnMap(refreshExtent);
          },
          error: (error) => {
          }
        });
    }
  }

  private _putRoadworksOnMap(refreshExtent: boolean) {
    let i: number = 0;
    for (let roadWorkNeedFeature of this.needsOnMap) {
      let needPoly: Polygon = RoadworkPolygon.convertToOlPoly(roadWorkNeedFeature.geometry);

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

      let activityFeature: Feature = new Feature({
        type: "Feature",
        name: "Roadwork activity",
        id: i++,
        geometry: activityPoly
      });

      activityFeature.set("status", this.roadWorkActivityFeat.properties.status);
      activityFeature.set("dateSksReal", this.roadWorkActivityFeat.properties.dateSksReal);

      this.roadWorkActivitySource.clear();
      this.roadWorkActivitySource.addFeature(activityFeature);
      this.roadWorkActivitySource.changed();

      if (refreshExtent) {
        let polyExtent: Extent = activityPoly.getExtent();
        this.setViewToPolyExtent(polyExtent);
      }
    }
  }

  public setRoadworkActivityFinished(){
    for(let feature of this.roadWorkActivitySource.getFeatures()){
      let featName: string = feature.get("name");
      if(featName === "Roadwork activity"){
        feature.set("status", 'coordinated');
        feature.set("dateSksReal", new Date());
        feature.changed()
      }
    }
  }

  private addFeatureFinished(event: any) { }

  private resizeMap(event: any = null) {
    let mapElement: HTMLElement | undefined;
    mapElement = document.getElementById("edit_activity_map") as HTMLElement;
    mapElement.style.height = screen.availHeight / 2 + "px";
  }

  private setViewToPolyExtent(polyExtent: Extent) {
    if (polyExtent && polyExtent.length >= 0 && polyExtent[0] !== Infinity) {
      const epsg2056Proj: Projection = getProjection('EPSG:2056') as Projection;
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
