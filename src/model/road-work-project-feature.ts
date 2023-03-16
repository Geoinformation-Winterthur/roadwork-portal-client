import { RoadworkPolygon } from "./road-work-polygon";
import { RoadWorkProjectProperties } from "./road-work-project-properties";

export class RoadWorkProjectFeature {
    type: string = "RoadWorkProjectFeature";
    properties: RoadWorkProjectProperties;
    geometry: RoadworkPolygon;

    constructor() {
        this.properties = new RoadWorkProjectProperties();
        this.geometry = new RoadworkPolygon();
    }
}