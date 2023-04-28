/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { ManagementAreaProperties } from "./management-area-properties";
import { RoadworkPolygon } from "./road-work-polygon";

export class ManagementAreaFeature {
    type: string = "ManagementAreaFeature";
    properties: ManagementAreaProperties;
    geometry: RoadworkPolygon;

    constructor() {
        this.properties = new ManagementAreaProperties();
        this.geometry = new RoadworkPolygon();
    }
}