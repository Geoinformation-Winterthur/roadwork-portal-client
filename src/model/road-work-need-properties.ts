/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { ManagementAreaFeature } from "./management-area-feature";
import { Priority } from "./priority";
import { RoadWorkNeedEnum } from "./road-work-need-enum";
import { Status } from "./status";
import { User } from "./user";

export class RoadWorkNeedProperties {
    uuid: string = "";
    name: string = "";
    kind: RoadWorkNeedEnum = new RoadWorkNeedEnum();
    orderer: User  = new User();
    created: Date = new Date(1, 0, 1);
    lastModified: Date = new Date(1, 0, 1);
    finishEarlyFrom: Date = new Date(1, 0, 1);
    finishEarlyTo: Date = new Date(1, 0, 1);
    finishOptimumFrom: Date = new Date(1, 0, 1);
    finishOptimumTo: Date = new Date(1, 0, 1);
    finishLateFrom: Date = new Date(1, 0, 1);
    finishLateTo: Date = new Date(1, 0, 1);
    priority: Priority = new Priority();
    status: Status = new Status();
    description: string = "";
    managementarea: ManagementAreaFeature
            = new ManagementAreaFeature();
    roadWorkActivityUuid: string = "";
    isEditingAllowed: boolean = false;
}
