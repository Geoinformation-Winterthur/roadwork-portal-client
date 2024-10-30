/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { ManagementArea } from "./management-area";
import { Priority } from "./priority";
import { Status } from "./status";
import { User } from "./user";

export class RoadWorkNeedProperties {
    uuid: string = "";
    name: string = "";
    orderer: User  = new User();
    created: Date = new Date(1, 0, 1);
    lastModified: Date = new Date(1, 0, 1);
    finishEarlyTo: Date = new Date(1, 0, 1);
    finishOptimumTo: Date = new Date(1, 0, 1);
    finishLateTo: Date = new Date(1, 0, 1);
    priority: Priority = new Priority();
    status: string = "";
    costs?: number;
    activityRelationType: string = "";
    description: string = "";
    roadWorkActivityUuid: string = "";
    isEditingAllowed: boolean = false;
    noteOfAreaManager: string = "";
    areaManagerNoteDate: Date = new Date(1, 0, 1);;
    areaManagerOfNote: User  = new User();
    isPrivate: boolean = false;
    section: string = "";
    comment: string = "";
    url: string = "";
    overarchingMeasure: boolean = false;
    desiredYearFrom?: number;
    desiredYearTo?: number;
    managementArea?: ManagementArea;
    hasPdfDocument: boolean = false;
    hasSpongeCityMeasures: boolean = false;
    spongeCityMeasures: string[] = [];
    workTitle?: string;
    projectType?: string;
    costsComment?: string;
    deleteReason?: string;
}
