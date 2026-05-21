/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Costs } from "./costs";
import { DocumentAttributes } from "./document-attributes";
import { ManagementArea } from "./management-area";
import { Priority } from "./priority";
import { Status } from "./status";
import { User } from "./user";
import { RoadWorkApprovals } from "./road-work-approvals";

export class RoadWorkNeedProperties {
    uuid: string = "";
    name: string = "";
    orderer: User  = new User();
    created: Date = new Date(1, 0, 1);
    approvals: RoadWorkApprovals = new RoadWorkApprovals();
    lastModified?: Date;
    finishEarlyTo: Date = new Date(1, 0, 1);
    finishOptimumTo: Date = new Date(1, 0, 1);
    finishLateTo: Date = new Date(1, 0, 1);
    priority: Priority = new Priority();
    status: string = "";
    activityRelationType: string = "";
    description: string = ""; // used for plannedTasks (#607, 2026.4)
    roadWorkActivityUuid: string = "";
    isEditingAllowed: boolean = false;
    noteOfAreaManager: string = "";
    areaManagerNoteDate: Date = new Date(1, 0, 1);;
    areaManagerOfNote: User  = new User();
    isPrivate: boolean = false;
    section: string = "";
    comment: string = ""; // used for constraints (#601, 2026.4)
    url: string = "";
    overarchingMeasure: boolean = false;
    desiredYearFrom?: number;
    desiredYearTo?: number;
    managementArea?: ManagementArea;
    hasSpongeCityMeasures: boolean = false;
    spongeCityMeasures: string[] = [];
    deleteReason?: string;
    documentAtts?: DocumentAttributes[];
    costs?: Costs[];
    isPrimary?: boolean;
    decline?: boolean = false;
    stillRelevant?: boolean = false;
    feedbackGiven?: boolean = false;
    constructionDuration?: number; // Added in 2026.4 (#608)
    acquisitionPlanned: string = "NO"; // Valid values: YES, NO, MAYBE (#609, 2026.4)
}
