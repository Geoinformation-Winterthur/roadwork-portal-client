import { ManagementAreaFeature } from "./management-area-feature";
import { Priority } from "./priority";
import { Status } from "./status";
import { User } from "./user";

export class RoadWorkNeedProperties {
    uuid: string = "";
    name: string  = "";
    kind: string  = "";
    orderer: User  = new User();
    finishEarlyFrom: Date = new Date(1, 0, 1);
    finishEarlyTo: Date = new Date(1, 0, 1);
    finishOptimumFrom: Date = new Date(1, 0, 1);
    finishOptimumTo: Date = new Date(1, 0, 1);
    finishLateFrom: Date = new Date(1, 0, 1);
    finishLateTo: Date = new Date(1, 0, 1);
    priority: Priority = new Priority();
    status: Status = new Status();
    comment: string = "";
    managementarea: ManagementAreaFeature
            = new ManagementAreaFeature();
}
