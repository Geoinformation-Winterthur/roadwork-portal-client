/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
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
                resultCoord.x = coord[0];
                resultCoord.y = coord[1];
                resultCoords.push(resultCoord);
            }    
        }
        let roadworkPolygon: RoadworkPolygon = new RoadworkPolygon();
        roadworkPolygon.coordinates = resultCoords;
        return roadworkPolygon;
    }

    public static convertToOlPoly(roadworkPolygon: RoadworkPolygon): Polygon {
        let olCoords: Coordinate[] = [];
        for(let coord of roadworkPolygon.coordinates){
            olCoords.push([coord.x, coord.y]);
        }
        let olPoly: Polygon = new Polygon([olCoords]);
        return olPoly;
    }

    public clone(): RoadworkPolygon {
        let polyClone: RoadworkPolygon = new RoadworkPolygon();
        let coordClone: RoadworkCoordinate;
        for(let coord of this.coordinates){
            coordClone = new RoadworkCoordinate();
            coordClone.x = coord.x;
            coordClone.x = coord.y;
            polyClone.coordinates.push(coordClone);
        }
        return polyClone;
    }
}

