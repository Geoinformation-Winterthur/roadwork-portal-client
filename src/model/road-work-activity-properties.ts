/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { CostTypes } from "./cost-types";
import { ManagementAreaFeature } from "./management-area-feature";
import { User } from "./user";

export class RoadWorkActivityProperties {
    uuid: string = "";
    name: string = "";
    managementarea: ManagementAreaFeature
            = new ManagementAreaFeature();
    projectManager: User  = new User();
    trafficAgent: User  = new User();
    description: string = "";
    created: Date = new Date(1,0,1);
    lastModified: Date = new Date(1, 0, 1);
    finishFrom: Date = new Date(1, 0, 1);
    finishTo: Date = new Date(1, 0, 1);
    costs: number = 0;
    costsType: CostTypes = new CostTypes();
    roadWorkNeedsUuids: string[] = [];
    isEditingAllowed: boolean = false;
}
