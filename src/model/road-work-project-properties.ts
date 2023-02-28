import { RoadWorkProjectPart } from "./road-work-project-part";

export class RoadWorkProjectProperties {
    uuid: number = -1;
    place: string = "";
    area: string = "";
    project: string = "";
    projectNo: number = -1;
    status: string = "not_coordinated";
    priority: string = 'high';
    realizationUntil: Date = new Date();
    active: boolean = false;
    trafficObstructionType: string = "";
    roadWorkProjectParts: RoadWorkProjectPart[] = [];

}
