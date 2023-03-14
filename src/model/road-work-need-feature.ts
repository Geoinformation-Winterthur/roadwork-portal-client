import Polygon from "ol/geom/Polygon";
import { RoadWorkNeedProperties } from "./road-work-need-properties";

export class RoadWorkNeedFeature {
    type: string = "RoadWorkNeedFeature";
    properties: RoadWorkNeedProperties;
    geometry: Polygon;

    constructor() {
        this.properties = new RoadWorkNeedProperties();
        this.geometry = new Polygon([]);
    }
}