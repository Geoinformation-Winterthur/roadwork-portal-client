/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { ActivityHistoryItem } from "./activity-history-item";
import { ConsultationInput } from "./consultation-input";
import { CostType } from "./cost-type";
import { Status } from "./status";
import { User } from "./user";

export class RoadWorkActivityProperties {
    uuid: string = "";
    name: string = "";
    projectManager: User = new User();
    trafficAgent: User = new User();
    areaManager: User = new User();
    description: string = "";
    created: Date = new Date(1,0,1);
    lastModified: Date = new Date(1, 0, 1);
    finishFrom: Date = new Date(1, 0, 1);
    finishTo: Date = new Date(1, 0, 1);
    costs?: number;
    costsType: CostType = new CostType();
    roadWorkNeedsUuids: string[] = [];
    status: Status = new Status();
    isEditingAllowed: boolean = false;
    isInInternet: boolean = false;
    billingAddress1: string = "";
    billingAddress2: string = "";
    investmentNo?: number;
    pdbFid: number = 0;
    strabakoNo: string = "";
    activityHistory: ActivityHistoryItem[] = [];
}
