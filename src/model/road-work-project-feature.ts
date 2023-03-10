import { Geometry } from "./geometry";
import { RoadWorkProjectProperties } from "./road-work-project-properties";

export class RoadWorkProjectFeature {
    type: string = "Feature";
    properties: RoadWorkProjectProperties;
    geometry: Geometry = new Geometry();

    constructor() {
        this.properties = new RoadWorkProjectProperties();
    }
}