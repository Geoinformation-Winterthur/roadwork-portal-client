import { ConstructionProjectProperties } from './construction-project-properties';
import { Geometry } from './geometry';

export class ConstructionProjectFeature {

    type: string;
    properties: ConstructionProjectProperties;    
    geometry: Geometry;

    constructor(){
        this.type = "Feature";
        this.geometry = new Geometry();
        this.properties = new ConstructionProjectProperties();
    }
    
}