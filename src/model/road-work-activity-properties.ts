import { CostTypes } from "./cost-types";
import { ManagementAreaFeature } from "./management-area-feature";
import { User } from "./user";

export class RoadWorkActivityProperties {
    uuid: string = "";
    managementarea: ManagementAreaFeature
            = new ManagementAreaFeature();
    projectManager: User  = new User();
    trafficAgent: User  = new User();
    comment: string = "";
    finishFrom: Date = new Date(1, 0, 1);
    finishTo: Date = new Date(1, 0, 1);
    costs: number = 0;
    costsType: CostTypes = new CostTypes();
}