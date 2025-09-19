/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Geoinformation Winterthur. All rights reserved.
 *
 * Component for drawing and editing a roadwork activity perimeter on an OpenLayers map.
 * - Shows base WMS layers, existing needs (requirements) and the current activity.
 * - Lets users draw a new polygon, modify an existing one, or copy from an existing need.
 * - Persists geometry back to the backend and maintains related "needs of activity".
 *
 * Notes:
 * - Uses Swiss projected CRS EPSG:2056 (LV95); proj4 definition registered at runtime.
 * - Screenshot capture stores a PNG data URL (via html2canvas) in StorageService.
 */
import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import Map from 'ol/Map';
import Feature from 'ol/Feature';
import { Geometry, Point, Polygon } from 'ol/geom';
import Tile from 'ol/layer/Tile';
import View from 'ol/View';
import Select from 'ol/interaction/Select';
import { SelectEvent } from 'ol/interaction/Select';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import Snap from 'ol/interaction/Snap';
import VectorLayer from 'ol/layer/Vector';
import { Extent } from 'ol/extent';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Circle from 'ol/style/Circle';
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
import html2canvas from 'html2canvas';
import { StorageService } from 'src/services/storage.service';
import { fromLonLat } from 'ol/proj';
import BaseLayer from 'ol/layer/Base';

@Component({
  selector: 'app-edit-activity-map',
  templateUrl: './edit-activity-map.component.html',
  styleUrls: ['./edit-activity-map.component.css']
})
export class EditActivityMapComponent implements OnInit {

  /** Host element reference for the OL map (target div). */
  @ViewChild('edit_activity_map', { static: true }) edit_activity_map!: ElementRef;
  /** Last captured map image as data URL (PNG base64). */
  imageDataUrl: string | null = null;
  
  /** The activity feature to display/edit; provided by parent. */
  @Input()
  roadWorkActivityFeat?: RoadWorkActivityFeature;

  /** Optional filter/year context for needs reloading. */
  chosenYear?: number;

  /** UI flags indicating current editing mode. */
  isInDrawNewMode: boolean = false;
  isDrawNewFinished: boolean = true;
  isInModifyExistingMode: boolean = false;

  /** OpenLayers map instance (created in initializeMap). */
  map: Map = new Map();

  /** Address search results and input string for geocoding/zoom. */
  addresses: Address[] = [];
  addressSearchString: string = "";

  /** Copy-from-existing-need mode and its Select interaction. */
  isInCopyExistingMode = false;
  copySelect?: Select;

  /** Layers & sources: needs layer, user-draw/edit layers, activity layer. */
  roadWorkNeedLayer!: VectorLayer<VectorSource<Geometry>>;
  userDrawSource: VectorSource = new VectorSource();
  userModifyVerticesSource: VectorSource = new VectorSource();
  roadWorkActivitySource: VectorSource = new VectorSource();
  roadWorkNeedSource: VectorSource = new VectorSource();

  /** User drawing & editing interactions. */
  polygonDraw?: Draw;
  polygonModify?: Modify;
  polygonSnap?: Snap;

  /** Shared service state: needs currently shown/linked to the activity. */
  public needsOfActivityService: NeedsOfActivityService;
  /** Cache of needs currently rendered on the map. */
  needsOnMap: RoadWorkNeedFeature[] = [];

  /** Injected services for persistence, lookups, notifications, and storage. */
  private roadWorkActivityService: RoadWorkActivityService;
  private addressService: AddressService;
  private snackBar: MatSnackBar;
  private roadWorkNeedService: RoadWorkNeedService;
  private managementAreaService: ManagementAreaService;
  private storageService: StorageService;

  public constructor(snackBar: MatSnackBar,
    roadWorkActivityService: RoadWorkActivityService,
    needsOfActivityService: NeedsOfActivityService,
    roadWorkNeedService: RoadWorkNeedService,
    managementAreaService: ManagementAreaService,
    addressService: AddressService,
    storageService: StorageService) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.managementAreaService = managementAreaService;
    this.addressService = addressService;
    this.storageService = storageService;
    this.snackBar = snackBar;    
  }

  /** Add responsive resize handler; map is set up in ngAfterViewInit. */
  ngOnInit() {
    addEventListener("resize", this.resizeMap);
  }

  /**
   * After the view is ready:
   * - Register EPSG:2056 projection.
   * - Build the map, sources, layers and interactions.
   * - Capture map images on move end (stored in StorageService).
   */
  ngAfterViewInit() {
    proj4.defs("EPSG:2056", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");
    register(proj4);
    this.initializeMap();
    this.resizeMap();     

    this.map.on('moveend', () => {
      this.captureMap();
    });
 
  }

  /**
   * Remove global listeners on destroy.
   * Note: `removeEventListener("addfeature", ...)` targets the window, not the
   * VectorSource—left as-is to preserve behavior; actual subscription removal is
   * handled via `this.userDrawSource.off` patterns elsewhere.
   */
  ngOnDestroy() {
    removeEventListener("resize", this.resizeMap);
    removeEventListener("addfeature", this.addFeatureFinished);
    // this.map.destroy();
  }

  /**
   * Create sources, layers, styles, interactions and the map view.
   * Also attaches listeners to update vertex helper points while drawing.
   */
  initializeMap() {

    /** Helper: determines if an activity is finished (affects stroke dash style). */
    function isRoadWorkActFinished(feature: any): boolean {
      let status: string = feature.get('status');
      let dateSksReal = feature.get('dateSksReal');
      if (status === 'coordinated' && dateSksReal)
        return true;
      return false;
    }

    /** Style for the activity perimeter (solid if finished, dashed otherwise). */
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

    /** Style for needs polygons (dashed when in "requirement" status). */
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
    this.roadWorkNeedLayer = new VectorLayer({
      source: this.roadWorkNeedSource,
      style: roadWorkNeedLayerStyleFunc
    });

    /** Style for user-drawn geometry (red fill/stroke for clarity). */
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

    /** Style for temporary vertex points shown during modify operations. */
    const modifyVerticesStyle = new Style({
      image: new Circle({
        radius: 5,
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.8)',
        }),
        stroke: new Stroke({
          color: '#ffcc33',
          width: 2,
        }),
      }),
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: '#ffcc33',
        width: 2,
      }),
    });

    this.userModifyVerticesSource = new VectorSource({ wrapX: false });
    let userModifyVerticesLayer = new VectorLayer({
      source: this.userModifyVerticesSource,
      style: modifyVerticesStyle
    });

    /**
     * While the user is drawing a polygon, continuously extract its vertices
     * into a dedicated point layer to give visual handles.
     */
    this.userDrawSource.on('change', () => {
      if (this.roadWorkActivityFeat) {
        const userDrawFeatures: Feature<Polygon>[] =
          this.userDrawSource.getFeatures() as Feature<Polygon>[];
        if (userDrawFeatures && userDrawFeatures.length != 0) {
          const modifyVertices: Feature[] = this.getPointsOfPoly(userDrawFeatures[0]);
          this.userModifyVerticesSource.clear();
          this.userModifyVerticesSource.addFeatures(modifyVertices);
        }
      }
    });

    // this.map = new EditableMap("edit_activity_map");

    /** Use Swiss LV95 projection; "getProjection" resolves by code. */
    const epsg2056Proj: Projection = getProjection('EPSG:2056') as Projection;

    /** Build the map with two WMS tile layers, then vector layers on top. */
    this.map = new Map({
      target: 'edit_activity_map',
      layers: [
        new Tile({
          source: new TileWMS({
            url: 'http://wms.zh.ch/upwms',
            params: { 'LAYERS': 'upwms', 'TILED': true },
            serverType: 'mapserver',
             crossOrigin: 'anonymous'
          })
        }),
        new Tile({
          source: new TileWMS({
            url: 'http://wms.zh.ch/OGDCMS3ZH',
            params: { 'LAYERS': 'OGDCMS3ZH', 'TILED': true },
            serverType: 'mapserver',
            crossOrigin: 'anonymous'
          })
        }),
        this.roadWorkNeedLayer,
        roadWorkActivityLayer,
        userDrawLayer,
        userModifyVerticesLayer
      ],
      view: new View({
        projection: epsg2056Proj,
        center: [2697567.0, 1262079.0],
        zoom: 14
      })
    });

    /** Polygon drawing interaction for creating a new activity geometry. */
    this.polygonDraw = new Draw({
      source: this.userDrawSource,
      type: "Polygon",
    });

    /**
     * Handler that runs after the first feature has been drawn:
     * - Leaves draw mode and removes the draw interaction (after a short delay).
     * - Sets flags to indicate draw completion.
     */
    this.addFeatureFinished = () => {
      if (this.userDrawSource.getState() === 'ready') {
        this.isInDrawNewMode = true;
        this.isDrawNewFinished = true;
        setTimeout(() => {
          if (this.polygonDraw !== undefined)
            this.map.removeInteraction(this.polygonDraw);
        }, 20);
        // this.endEditing();
      }
    }

    /** Connect the "feature added" signal to the above handler. */
    this.userDrawSource.on('addfeature', this.addFeatureFinished);

    /** Initial load of needs and activity geometry onto the map. */
    this._reloadRoadworkNeeds(true);
  }

  /** Year filter changed (if used) → reload needs; keep current extent. */
  onChangeYear() {
    this._reloadRoadworkNeeds(false);
  }

  /**
   * Persist the currently drawn polygon:
   * - Copies geometry from the draw layer into the activity feature.
   * - Ensures management area consistency via a server call.
   * - Updates the activity in the backend, refreshes related needs,
   *   and shows a snackbar on success or error.
   */
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

  /** Enter "draw a new polygon" mode. Clears previous draft. */
  drawNew() {
    this.userDrawSource.clear();
    if (this.polygonDraw !== undefined) {
      this.map.addInteraction(this.polygonDraw);
      this.isInDrawNewMode = true;
      this.isDrawNewFinished = false;
    }
  }

  /**
   * Enter "modify existing polygon" mode:
   * - Seeds the draw source with the current activity geometry.
   * - Enables Modify and Snap interactions for vertex editing.
   * - Shows helper point features at each vertex.
   */
  modifyExisting() {
    if (this.userDrawSource && this.roadWorkActivityFeat) {
      this.userDrawSource.clear();

      let poly: Polygon = RoadworkPolygon.convertToOlPoly(this.roadWorkActivityFeat.geometry);
      let feat: Feature = new Feature();
      feat.setGeometry(poly);
      this.userDrawSource.addFeature(feat);

      this.polygonModify = new Modify({
        source: this.userDrawSource
      });
      this.map.addInteraction(this.polygonModify);

      this.polygonSnap = new Snap({
        source: this.userDrawSource
      });
      this.map.addInteraction(this.polygonSnap);

      const modifyVertices: Feature[] = this.getPointsOfPoly(feat);
      this.userModifyVerticesSource.clear();
      this.userModifyVerticesSource.addFeatures(modifyVertices);

      this.isInModifyExistingMode = true;
    }
  }

  /**
   * Exit any editing/copy mode; optionally save the draft geometry.
   * - Removes interactions and clears helper/draft sources.
   * @param status "save" to persist via sendGeometry; any other value discards.
   */
  endEditing(status: string) {
    this.isInDrawNewMode = false;
    this.isInModifyExistingMode = false;

    if (this.isInCopyExistingMode) {
      this.isInCopyExistingMode = false;
      if (this.copySelect) {
        this.map.removeInteraction(this.copySelect);
        this.copySelect = undefined;
      }
    }

    if (status == "save")
      this.sendGeometry();
    if (this.polygonDraw !== undefined)
      this.map.removeInteraction(this.polygonDraw);
    if (this.polygonModify !== undefined)
      this.map.removeInteraction(this.polygonModify);
    if (this.polygonSnap !== undefined)
      this.map.removeInteraction(this.polygonSnap);

    this.userDrawSource.clear();
    this.userModifyVerticesSource.clear();
  }

  /**
   * Copy geometry from an existing need:
   * - Enables a Select interaction restricted to the needs layer.
   * - On first selection, clones the polygon, puts it into the draft layer,
   *   writes it into the current activity, and immediately saves.
   */
  copyExisting() {
    this.isInCopyExistingMode = true;
    this.userDrawSource.clear();   // eventuell alte Skizze entfernen

    // Select-Interaction nur auf Need-Layer
    this.copySelect = new Select({
      layers: [this.roadWorkNeedLayer],
      hitTolerance: 5   // etwas Fehlertoleranz
    });
    this.map.addInteraction(this.copySelect);

    // Einmaliges Auswählen beobachten
    const onSelect = (e: SelectEvent) => {
      if (e.selected.length) {
        const needFeat = e.selected[0] as Feature<Polygon>;
        const cloned = (needFeat.getGeometry() as Polygon).clone();

        // aufs Zeichen-Layer legen, damit die roten "User-Vertices" erscheinen
        const draft = new Feature({ geometry: cloned });
        this.userDrawSource.addFeature(draft);

        // Geometrie in das Vorhaben schreiben
        if (this.roadWorkActivityFeat) {
          this.roadWorkActivityFeat.geometry = RoadworkPolygon.convertFromOlPolygon(cloned);
        }

        // gleich speichern – oder dem Nutzer die Save-Schaltfläche lassen
        this.endEditing('save');
      }
    };

    this.copySelect.once('select', onSelect);
  }

  /** Refresh suggestion list of addresses for the current search string. */
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

  /**
   * Zoom to the map coordinates of the address that exactly matches the search string.
   * Uses a high zoom level (18) to focus on the parcel/street detail.
   */
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

  /**
   * Load needs to display on the map.
   * - First loads all "requirement" needs (status code filter).
   * - If the current activity is not finished, loads its linked needs explicitly.
   * - Finally calls `_putRoadworksOnMap` to redraw layers and optionally fit view.
   */
  private _reloadRoadworkNeeds(refreshExtent: boolean) {
    this.roadWorkNeedSource.clear();
    this.roadWorkNeedService.getRoadWorkNeeds([], undefined, undefined,
      "", "", "", false, undefined, undefined, undefined, ["requirement"])
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

  /**
   * Render needs and the current activity on their respective vector sources.
   * Optionally fit the view to the activity polygon extent.
   */
  private _putRoadworksOnMap(refreshExtent: boolean) {
    // Layer leeren, bevor wir neue Features hinzufügen:
    this.roadWorkNeedSource.clear();
    
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

  /**
   * Temporarily mark the in-memory activity feature as finished.
   * This affects the style (removes dash) until persisted elsewhere.
   */
  public setRoadworkActivityFinished() {
    for (let feature of this.roadWorkActivitySource.getFeatures()) {
      let featName: string = feature.get("name");
      if (featName === "Roadwork activity") {
        feature.set("status", 'coordinated');
        feature.set("dateSksReal", new Date());
        feature.changed()
      }
    }
  }

  /** Placeholder required by earlier event handler wiring; intentionally empty. */
  private addFeatureFinished(event: any) { }

  /**
   * Resize handler: sets the map container height to half the available screen height.
   * Keeps the map usable within varying viewport sizes.
   */
  private resizeMap(event: any = null) {
    let mapElement: HTMLElement | undefined;
    mapElement = document.getElementById("edit_activity_map") as HTMLElement;
    if (mapElement && mapElement.style)
      mapElement.style.height = screen.availHeight / 2 + "px";
  }

  /**
   * Fit the map view to the extent of a polygon.
   * Creates a new View with EPSG:2056 and assigns it to the map.
   */
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

  /**
   * Extract vertex points from a polygon feature and return them as Point features.
   * Used to visualize editable vertices during modify operations.
   */
  private getPointsOfPoly(feature: Feature): Feature[] {
    const result: Feature[] = [];
    const geom = feature.getGeometry();
    if (geom && geom.getType() === 'Polygon') {
      const coords = (geom as Polygon).getCoordinates();
      if (coords.length != 0) {
        for (let coord of coords[0]) {
          result.push(new Feature(new Point(coord)));
        }
      }
    }
    return result;
  }

  /** Notify OpenLayers that layer collection has changed (forces re-render). */
  refresh() {
    this.map.getLayers().changed();
  }

  /**
   * Create and store a screenshot of the current map.
   * - If the visible map element is available, capture it directly.
   * - Otherwise, render a temporary off-screen map clone to capture.
   * The PNG data URL is stored under the key 'ProjectPerimeter' in StorageService.
   */
  captureMap() {
    const mapElement = document.getElementById('edit_activity_map') as HTMLElement | null;

    if (mapElement && this.map) {
      this.makeScreenshotFromElement(mapElement, this.map);
      return;
    }
    
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-99999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    const baseView = this.map ? this.map.getView() : undefined;
    const baseLayers = this.map ? this.map.getLayers().getArray() : [];

    const tempMap = new Map({
      target: container,
      layers: this.cloneLayers(baseLayers),
      view: this.cloneView(baseView),
      controls: []
    });

    this.makeScreenshotFromElement(container, tempMap, () => {
      tempMap.setTarget(null as any);
      document.body.removeChild(container);
    });
  }

  /**
   * Helper to render an HTML element (map container) to a canvas and then to a PNG data URL.
   * Uses OL's `rendercomplete` to ensure layers are drawn before capturing.
   * @param element The DOM element to capture.
   * @param mapInstance The map whose render lifecycle we hook into.
   * @param afterCapture Optional callback to clean up temporary resources.
   */
  private makeScreenshotFromElement(element: HTMLElement, mapInstance: Map, afterCapture?: () => void) {
    mapInstance.once('rendercomplete', () => {
      html2canvas(element, { scale: 2, useCORS: false }).then((canvas) => {
        const dataUrl = canvas.toDataURL('image/png');
        try {
          this.storageService.save('ProjectPerimeter', dataUrl);
        } catch (error) {
          console.error(error);
        }
        afterCapture?.();
      });
      mapInstance.renderSync();
    });
  }

  /**
   * Clone the current view or create a default one (WGS84 center -> projected).
   * Note: copies center/zoom/rotation/projection; other dynamic options are omitted.
   */
  private cloneView(src?: View): View {
    if (!src) {
      return new View({
        center: fromLonLat([8.719, 47.499]),
        zoom: 13
      });
    }
    return new View({
      center: src.getCenter(),
      zoom: src.getZoom(),
      rotation: src.getRotation(),
      projection: src.getProjection()
    });
  }

  /**
   * Shallow-copy of the layer array (retains original layer instances).
   * This is sufficient for off-screen rendering in the temporary map.
   */
  private cloneLayers(srcLayers?: BaseLayer[]): BaseLayer[] {
    if (!srcLayers) return [];    
    return srcLayers.map(layer => layer);
  }

}
