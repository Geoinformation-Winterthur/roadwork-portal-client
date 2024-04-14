/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { ActivityHistoryItem } from "./activity-history-item";
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
    comment: string = "";
    section: string = "";
    type: string = "";
    projectType: string = "";
    overarchingMeasure: boolean = false;
    desiredYear: number = -1;
    prestudy: boolean = false;
    created: Date = new Date(1,0,1);
    lastModified: Date = new Date(1, 0, 1);
    finishFrom: Date = new Date(1, 0, 1);
    finishTo: Date = new Date(1, 0, 1);
    startOfConstruction: Date = new Date(1, 0, 1);
    endOfConstruction: Date = new Date(1, 0, 1);
    consultDue: Date = new Date(1, 0, 1);
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
    projectNo: string = "";
    dateSks: string = "";
    dateKap: string = "";
    dateOks: string = "";
    dateGlTba: Date = new Date(1, 0, 1);
    activityHistory: ActivityHistoryItem[] = [];
}
