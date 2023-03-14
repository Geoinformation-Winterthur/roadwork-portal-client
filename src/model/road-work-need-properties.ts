export class RoadWorkNeedProperties {
    uuid: string = "";
    name: string  = "";
    kind: string  = "";
    ordererUuid: string  = "";
    finishEarlyFrom: Date = new Date(1, 0, 1);
    finishEarlyTo: Date = new Date(1, 0, 1);
    finishOptimumFrom: Date = new Date(1, 0, 1);
    finishOptimumTo: Date = new Date(1, 0, 1);
    finishLateFrom: Date = new Date(1, 0, 1);
    finishLateTo: Date = new Date(1, 0, 1);
    priorityUuid: string = "";
    statusUuid: string = "";
    comment: string = "";
    managementareaUuid: string = "";
}
