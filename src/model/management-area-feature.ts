import Polygon from "ol/geom/Polygon";
import { ManagementAreaProperties } from "./management-area-properties";

export class ManagementAreaFeature {
    type: string = "ManagementAreaFeature";
    properties: ManagementAreaProperties;
    geometry: Polygon;

    constructor() {
        this.properties = new ManagementAreaProperties();
        this.geometry = new Polygon([]);
    }
}