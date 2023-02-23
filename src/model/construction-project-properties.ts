import { ConstructionProjectPart } from './construction-project-part';

export class ConstructionProjectProperties {    
    id:number = -1;
    place: string = "";
    area: string = "";
    project: string = "";
    projectNo: number = -1;
    realizationUntil?: Date = undefined;
    inactive: boolean = true;
    trafficObstructionType: string = "";
    playdeviceParts: ConstructionProjectPart[] = [];

    public getId(): number {
        return this.id;
    }
}