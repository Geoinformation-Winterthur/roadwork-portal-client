/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Vermessungsamt Winterthur. All rights reserved.
 */
export class Geometry {

    public type: string = "";
    public coordinates: number[];
    public bbox: number[] = [];
    public center: number[] = [];

    constructor() {
        this.type = "Polygon";
        this.coordinates = [];
    }

}

export enum GeometryType {
    Point,
    Polygon
}