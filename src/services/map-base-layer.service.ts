import { Injectable } from '@angular/core';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';

export type BaseLayerName =
  | 'stadtplan'
  | 'upwms'
  | 'standard'
  | 'swissimage'
  | 'osm_de';

export interface BaseLayers {
  stadtplan: TileLayer<any>;
  upwms: TileLayer<any>;
  standard: TileLayer<any>;
  swissimage: TileLayer<any>;
  osmDe: TileLayer<any>;
}

@Injectable({
  providedIn: 'root'
})
export class MapBaseLayerService {

  createBaseLayers(): BaseLayers {
    return {
      stadtplan: new TileLayer({
        visible: true,
        source: new TileWMS({
          url: 'https://stadtplantest.winterthur.ch/wms/Hintergrundkarte_LK_AV_Situationsplan',
          params: {
            LAYERS: [
              'Landeskarte200',
              'Landeskarte100',
              'Landeskarte50',
              'Landeskarte25',
              'Wald',
              'Gewaesser',
              'AVSituationsplanZH_mask',
              'ZH_AvSituationsplan_winterthur'
            ].join(','),
            VERSION: '1.1.1',
            FORMAT: 'image/png',
            TRANSPARENT: true,
            STYLES: '',
            SRS: 'EPSG:2056',
            DPI: 96,
            TILED: true
          },
          serverType: 'mapserver',
          crossOrigin: 'anonymous'
        })
      }),

      upwms: new TileLayer({
        visible: false,
        source: new TileWMS({
          url: 'https://wms.zh.ch/upwms',
          params: {
            LAYERS: 'upwms',
            TILED: true
          },
          serverType: 'mapserver',
          crossOrigin: 'anonymous'
        })
      }),

      standard: new TileLayer({
        visible: false,
        source: new TileWMS({
          url: 'https://wms.zh.ch/OGDCMS3ZH',
          params: {
            LAYERS: 'OGDCMS3ZH',
            TILED: true
          },
          serverType: 'mapserver',
          crossOrigin: 'anonymous'
        })
      }),

      swissimage: new TileLayer({
        visible: false,
        source: new XYZ({
          url: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg',
          crossOrigin: 'anonymous',
          maxZoom: 20
        })
      }),

      osmDe: new TileLayer({
        visible: false,
        source: new XYZ({
          url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
          crossOrigin: 'anonymous',
          maxZoom: 22
        })
      })
    };
  }

  setVisibleBaseLayer(baseLayers: BaseLayers, layerName: BaseLayerName): void {
    baseLayers.stadtplan.setVisible(layerName === 'stadtplan');
    baseLayers.upwms.setVisible(layerName === 'upwms');
    baseLayers.standard.setVisible(layerName === 'standard');
    baseLayers.swissimage.setVisible(layerName === 'swissimage');
    baseLayers.osmDe.setVisible(layerName === 'osm_de');
  }

  asArray(baseLayers: BaseLayers): TileLayer<any>[] {
    return [
      baseLayers.stadtplan,
      baseLayers.upwms,
      baseLayers.standard,
      baseLayers.swissimage,
      baseLayers.osmDe
    ];
  }
}