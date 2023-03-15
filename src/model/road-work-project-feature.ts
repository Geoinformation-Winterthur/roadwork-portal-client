import Polygon from "ol/geom/Polygon";
import { RoadWorkProjectProperties } from "./road-work-project-properties";

export class RoadWorkProjectFeature {
    type: string = "RoadWorkProjectFeature";
    properties: RoadWorkProjectProperties;
    geometry: Polygon;

    constructor() {
        this.properties = new RoadWorkProjectProperties();
        this.geometry = new Polygon([]);
    }
}