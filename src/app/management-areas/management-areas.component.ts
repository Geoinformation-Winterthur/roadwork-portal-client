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
import VectorLayer from 'ol/layer/Vector';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import { MatSnackBar } from '@angular/material/snack-bar';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { ManagementAreaService } from 'src/services/management-area.service';
import { FormControl } from '@angular/forms';
import { User } from 'src/model/user';
import { UserService } from 'src/services/user.service';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { ManagementArea } from 'src/model/management-area';

@Component({
  selector: 'app-management-areas',
  templateUrl: './management-areas.component.html',
  styleUrls: ['./management-areas.component.css']
})
export class ManagementAreasComponent implements OnInit {

  map: Map = new Map();

  loadSource: VectorSource = new VectorSource();

  managerOfArea1EnumControl: FormControl = new FormControl();
  managerOfArea2EnumControl: FormControl = new FormControl();
  managerOfArea3EnumControl: FormControl = new FormControl();
  managerOfArea4EnumControl: FormControl = new FormControl();

  substituteManagerOfArea1EnumControl: FormControl = new FormControl();
  substituteManagerOfArea2EnumControl: FormControl = new FormControl();
  substituteManagerOfArea3EnumControl: FormControl = new FormControl();
  substituteManagerOfArea4EnumControl: FormControl = new FormControl();

  availableAreaManagerEnums: User[] = [];

  userService: UserService;

  private managementAreaService: ManagementAreaService;
  private managementAreasUuids: string[] = [];
  private snackBar: MatSnackBar;

  public constructor(snackBar: MatSnackBar,
    managementAreaService: ManagementAreaService,
    userService: UserService) {
    this.managementAreaService = managementAreaService;
    this.userService = userService;
    this.snackBar = snackBar;
  }

  ngOnInit() {
    addEventListener("resize", this.resizeMap);

    this.userService.getAllTerritoryManagers()
      .subscribe({
        next: (territoryManagers) => {
          this.availableAreaManagerEnums = territoryManagers;
        },
        error: (error) => {
        }
      });

  }

  ngAfterViewInit() {
    proj4.defs("EPSG:2056", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");
    register(proj4);
    this.initializeMap();
  }

  ngOnDestroy() {
    removeEventListener("resize", this.resizeMap);
  }

  initializeMap() {

    function managementAreasStyleFunc(feature: any, resolution: any) {
        let fillColor: string;
        
        switch (feature.get('uuid')) {
          case '316c6468-81e5-4156-8817-ba13a185d0a5':            
            fillColor = 'rgba(238, 193, 193, 0.5)';
            break;
          case  '3028fb7e-c07d-4dc4-a1d2-f627e875d4ae':
            fillColor = 'rgba(252, 252, 201, 0.5)';            
            break;
          case  '4dbc20b8-4a91-40da-9ef4-07de90b89f34':
            fillColor = 'rgba(176, 184, 224, 0.5)';
            break;
          case  '330e0d79-d844-41bd-b175-c345dad0c619':
            fillColor = 'rgba(189, 215, 156, 0.5)';
            break;                   
          default:
            fillColor = feature.get('color_fill');
            break;
        }
        
      let managementAreasStyle: Style = new Style({
        fill: new Fill({
          color: fillColor
        }),
        stroke: new Stroke({
          color: feature.get('color_stroke')
        }),
        text: new Text({
          text: feature.get('name') + '\n (' + feature.get('managername') + ")",
          fill: new Fill({
            color: 'rgba(68, 53, 84,1.0)'
          }),
          overflow: true,
          textAlign: "center",
          font: "20px sans-serif"
        })
      });
      return [managementAreasStyle];
    }

    this.loadSource = new VectorSource({ wrapX: false });
    let loadLayer = new VectorLayer({
      source: this.loadSource,
      style: managementAreasStyleFunc
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
        center: [974000.5, 6024000.72],
        zoom: 13
      })
    });

    this.resizeMap(null);

    this.loadGeometry();

  }

  loadGeometry() {

    this.managementAreaService
      .getManagementAreas()
      .subscribe({
        next: (managementAreasCollection) => {
          if (managementAreasCollection !== undefined) {
            this.loadSource.clear();
            for (let featureJson of managementAreasCollection.features) {
              let generalObject: any = featureJson;
              let managementAreaPoly: Polygon = new Polygon(generalObject.geometry.coordinates);
              managementAreaPoly.transform("EPSG:2056", 'EPSG:3857');
              let managementArea: Feature = new Feature({
                geometry: managementAreaPoly
              });
              managementArea.setProperties(generalObject.properties, true);
              this.loadSource.addFeature(managementArea);

              if (managementArea.get("uuid") == "316c6468-81e5-4156-8817-ba13a185d0a5") {
                this.managementAreasUuids[0] = managementArea.get("uuid");
                this.managerOfArea1EnumControl.setValue(managementArea.get("manager_uuid"));
                this.substituteManagerOfArea1EnumControl.setValue(managementArea.get("substitutemanager_uuid"));
              }

              if (managementArea.get("uuid") == "3028fb7e-c07d-4dc4-a1d2-f627e875d4ae") {
                this.managementAreasUuids[1] = managementArea.get("uuid");
                this.managerOfArea2EnumControl.setValue(managementArea.get("manager_uuid"));
                this.substituteManagerOfArea2EnumControl.setValue(managementArea.get("substitutemanager_uuid"));
              }

              if (managementArea.get("uuid") == "4dbc20b8-4a91-40da-9ef4-07de90b89f34") {
                this.managementAreasUuids[2] = managementArea.get("uuid");
                this.managerOfArea3EnumControl.setValue(managementArea.get("manager_uuid"));
                this.substituteManagerOfArea3EnumControl.setValue(managementArea.get("substitutemanager_uuid"));
              }

              if (managementArea.get("uuid") == "330e0d79-d844-41bd-b175-c345dad0c619") {
                this.managementAreasUuids[3] = managementArea.get("uuid");
                this.managerOfArea4EnumControl.setValue(managementArea.get("manager_uuid"));
                this.substituteManagerOfArea4EnumControl.setValue(managementArea.get("substitutemanager_uuid"));
              }

            }
            this.loadSource.changed();
          }
        },
        error: (error) => {
          this.snackBar.open("Gebietsmanagement-Flächen konnten NICHT geladen werden", "", {
            duration: 4000,
          });
        }
      });

  }

  updateManagerOfArea(managerOfAreaEnumControl: FormControl, areaNo: number, managerType: string) {
    let managementArea: ManagementArea = new ManagementArea();
    managementArea.uuid = this.managementAreasUuids[areaNo];


    // Decide whether we are updating the main manager or the substitute manager
    if (managerType == 'MAIN') {
      // update main manager
      managementArea.manager.uuid = managerOfAreaEnumControl.value;
    } else if (managerType === 'SUBST') {
      // update substitute manager
      managementArea.substituteManager.uuid = managerOfAreaEnumControl.value;
    }

    this.managementAreaService.updateManagementArea(managementArea)
      .subscribe({
        next: (managementArea) => {
          ErrorMessageEvaluation._evaluateErrorMessage(managementArea);
          if (managementArea.errorMessage.trim().length !== 0) {
            this.snackBar.open(managementArea.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.snackBar.open("Gebietsmanagement erfolgreich aktualisiert", "", {
              duration: 4000
            });

            // Update both manager and substitute manager on the feature if present
            for (let feat of this.loadSource.getFeatures()) {
              if (feat.get("uuid") === managementArea.uuid) {

                // main manager
                if (managementArea.manager) {
                  feat.set("manager_uuid", managementArea.manager.uuid);
                  feat.set(
                    "managername",
                    (managementArea.manager.firstName || "") + " " +
                    (managementArea.manager.lastName || "")
                  );
                }

                // substitute manager
                if (managementArea.substituteManager) {
                  feat.set("substitute_manager_uuid", managementArea.substituteManager.uuid);
                  feat.set(
                    "substitute_managername",
                    (managementArea.substituteManager.firstName || "") + " " +
                    (managementArea.substituteManager.lastName || "")
                  );
                }
              }
            }
          }
        },
        error: (error) => {
        }
      });
  }



  private resizeMap(event: any) {
    let mapElement: HTMLElement | undefined;
    mapElement = document.getElementById("management_areas_map") as HTMLElement;
    if(mapElement && mapElement.style)
      mapElement.style.height = screen.availHeight / 2 + "px";
  }

}
