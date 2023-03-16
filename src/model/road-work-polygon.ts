import { Coordinate } from "ol/coordinate";
import { LinearRing, Polygon } from "ol/geom";
import { RoadworkCoordinate } from "./roadwork-coordinate";

export class RoadworkPolygon
{
    public coordinates: RoadworkCoordinate[];

    constructor() {
        this.coordinates = [];
    }

    public static convertFromOlPolygon(polygon: Polygon) : RoadworkPolygon {
        let resultCoords: RoadworkCoordinate[] = [];
        let extRing: LinearRing | null = polygon.getLinearRing(0);
        let resultCoord: RoadworkCoordinate;
        if(extRing){
            for(let coord of extRing.getCoordinates()){
                resultCoord = new RoadworkCoordinate();
                resultCoord.X = coord[0];
                resultCoord.Y = coord[1];
                resultCoords.push(resultCoord);
            }    
        }
        let roadworkPolygon: RoadworkPolygon = new RoadworkPolygon();
        roadworkPolygon.coordinates = resultCoords;
        return roadworkPolygon;
    }

    public convertToOlPoly(): Polygon {
        let olPoly: Polygon = new Polygon([]);
        let olCoords: Coordinate[] = [];
        for(let coord of this.coordinates){
            olCoords.push([coord.X], [coord.Y]);
        }
        let polyRings = [olCoords];
        olPoly.setCoordinates(polyRings);
        return olPoly;
    }

    public clone(): RoadworkPolygon {
        let polyClone: RoadworkPolygon = new RoadworkPolygon();
        let coordClone: RoadworkCoordinate;
        for(let coord of this.coordinates){
            coordClone = new RoadworkCoordinate();
            coordClone.X = coord.X;
            coordClone.Y = coord.Y;
            polyClone.coordinates.push(coordClone);
        }
        return polyClone;
    }
}

