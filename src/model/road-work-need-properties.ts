/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
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
    finishEarlyTo: Date = new Date(1, 0, 1);
    finishOptimumTo: Date = new Date(1, 0, 1);
    finishLateTo: Date = new Date(1, 0, 1);
    priority: Priority = new Priority();
    status: Status = new Status();
    costs?: number;
    relevance: number = -1;
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
}
