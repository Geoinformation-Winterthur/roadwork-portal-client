import { Coordinate } from "ol/coordinate";

export class RoadworkCoordinate
{
    public X: number = 0;
    public Y: number = 0;

    constructor() {}

    constructFromXY(X: number, Y: number) : RoadworkCoordinate {
        let coordinate: RoadworkCoordinate = new RoadworkCoordinate();
        coordinate.X = X;
        coordinate.Y = Y;
        return coordinate;
    }
    
}

