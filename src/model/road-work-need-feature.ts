import { RoadWorkNeedProperties } from "./road-work-need-properties";
import { RoadworkPolygon } from "./road-work-polygon";

export class RoadWorkNeedFeature {
    type: string = "RoadWorkNeedFeature";
    properties: RoadWorkNeedProperties;
    geometry: RoadworkPolygon;
    errorMessageCode: string;

    constructor() {
        this.properties = new RoadWorkNeedProperties();
        this.geometry = new RoadworkPolygon();
        this.errorMessageCode = "";
    }
}