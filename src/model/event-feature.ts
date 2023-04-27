import { EventProperties } from "./event-properties";
import { RoadworkPolygon } from "./road-work-polygon";

export class EventFeature {
    type: string = "EventFeature";
    properties: EventProperties;
    geometry: RoadworkPolygon;
    errorMessage: string;

    constructor() {
        this.properties = new EventProperties();
        this.geometry = new RoadworkPolygon();
        this.errorMessage = "";
    }
}