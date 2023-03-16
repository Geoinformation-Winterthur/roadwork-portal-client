import { RoadWorkNeedProperties } from "./road-work-need-properties";
import { RoadworkPolygon } from "./road-work-polygon";

export class RoadWorkNeedFeature {
    type: string = "RoadWorkNeedFeature";
    properties: RoadWorkNeedProperties;
    geometry: RoadworkPolygon;

    constructor() {
        this.properties = new RoadWorkNeedProperties();
        this.geometry = new RoadworkPolygon();
    }
}