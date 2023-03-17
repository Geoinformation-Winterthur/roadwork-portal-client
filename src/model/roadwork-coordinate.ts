import { Coordinate } from "ol/coordinate";

export class RoadworkCoordinate
{
    public x: number = 0;
    public y: number = 0;

    constructor() {}

    constructFromXY(x: number, y: number) : RoadworkCoordinate {
        let coordinate: RoadworkCoordinate = new RoadworkCoordinate();
        coordinate.x = x;
        coordinate.y = y;
        return coordinate;
    }
    
}

