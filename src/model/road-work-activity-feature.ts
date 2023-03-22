import { RoadworkPolygon } from "./road-work-polygon";
import { RoadWorkActivityProperties } from "./road-work-activity-properties";

export class RoadWorkActivityFeature {
    type: string = "RoadWorkActivityFeature";
    properties: RoadWorkActivityProperties;
    geometry: RoadworkPolygon;

    constructor() {
        this.properties = new RoadWorkActivityProperties();
        this.geometry = new RoadworkPolygon();
    }
}