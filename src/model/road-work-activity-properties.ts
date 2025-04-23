/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { ActivityHistoryItem } from "./activity-history-item";
import { DocumentAttributes } from "./document-attributes";
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
    desiredYearFrom: number = -1;
    desiredYearTo: number = -1;
    prestudy: boolean = false;
    created: Date = new Date(1,0,1);
    lastModified: Date = new Date(1, 0, 1);
    finishEarlyTo?: Date;
    finishOptimumTo: Date = new Date(1, 0, 1);
    finishLateTo?: Date;
    startOfConstruction?: Date;
    endOfConstruction?: Date;
    dateOfAcceptance?: Date;
    consultDue: Date = new Date(1, 0, 1);
    costs?: number;
    costsType: string = "";
    roadWorkNeedsUuids: string[] = [];
    status: string = "";
    isEditingAllowed: boolean = false;
    isInInternet: boolean = false;
    billingAddress1: string = "";
    billingAddress2: string = "";
    investmentNo?: number;
    pdbFid: number = 0;
    strabakoNo: string = "";
    projectNo: string = "";
    dateSks?: Date;
    dateSksReal?: Date;
    dateKap?: Date;
    dateKapReal?: Date;
    dateOks?: Date;
    dateOksReal?: Date;
    dateGlTba?: Date;
    dateGlTbaReal?: Date;
    activityHistory: ActivityHistoryItem[] = [];
    evaluation: number = 0;
    evaluationSks: number = 0;
    isPrivate: boolean = false;
    involvedUsers: User[] = [];
    datePlanned?: Date;
    dateAccept?: Date;
    dateGuarantee?: Date;
    isStudy: boolean = false;
    dateStudyStart?: Date;
    dateStudyEnd?: Date;
    projectStudyApproved?: Date;
    studyApproved?: Date;
    isDesire: boolean = false;
    dateDesireStart?: Date;
    dateDesireEnd?: Date;
    isParticip: boolean = false;
    dateParticipStart?: Date;
    dateParticipEnd?: Date;
    isPlanCirc: boolean = false;
    datePlanCircStart?: Date;
    datePlanCircEnd?: Date;
    dateConsultStart?: Date;
    dateConsultEnd?: Date;
    dateConsultClose?: Date;
    dateReportStart?: Date;
    dateReportEnd?: Date;
    dateReportClose?: Date;
    dateInfoStart?: Date;
    dateInfoEnd?: Date;
    dateInfoClose?: Date;
    isAggloprog: boolean = false;
    url: string = "";
    documentAtts?: DocumentAttributes[];
    dateStartInconsult?: Date;
    dateStartVerified?: Date; 
    dateStartReporting?: Date;
    dateStartSuspended?: Date;
    dateStartCoordinated?: Date;
    isSksRelevant?: boolean = true;
    costLastModified?: Date
    costLastModifiedBy?: User
}
