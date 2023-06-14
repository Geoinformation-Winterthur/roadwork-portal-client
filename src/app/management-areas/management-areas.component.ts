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

  availableAreaManagerEnums: string[] = ["Heinz Mettler", "Tobias Juon", "Phuentsok Chokchampa"];

  private managementAreaService: ManagementAreaService;
  private snackBar: MatSnackBar;

  public constructor(snackBar: MatSnackBar,
    managementAreaService: ManagementAreaService) {
    this.managementAreaService = managementAreaService;
    this.snackBar = snackBar;
    setTimeout(() => {
      this.resizeMap(null);
    }, 20);
  }

  ngOnInit() {
    addEventListener("resize", this.resizeMap);
    this.managerOfArea1EnumControl.setValue("Heinz Mettler");
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
      let managementAreasStyle: Style = new Style({
        fill: new Fill({
          color: feature.get('color_fill')
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

  private resizeMap(event: any) {
    let mapElement: HTMLElement = document.getElementById("management_areas_map") as HTMLElement;
    let mapElementRect: DOMRect = mapElement.getBoundingClientRect();
    let topCoord: number = Math.round(mapElementRect.top);
    let mapHeight: number = window.innerHeight - (topCoord + 70);
    if (window.innerWidth / mapHeight > 3.5) {
      mapHeight = window.innerWidth / 3.5;
    }
    mapElement.style.height = mapHeight + "px";
  }

}
