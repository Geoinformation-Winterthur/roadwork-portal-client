import { Geometry } from "./geometry";
import { RoadWorkProjectProperties } from "./road-work-project-properties";

export class RoadWorkProjectFeature {
    type: string = "";
    properties: RoadWorkProjectProperties;
    geometry: Geometry = new Geometry();

    constructor() {
        this.type = "Feature";
        this.properties = new RoadWorkProjectProperties();
    }
}