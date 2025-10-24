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
    sessionComment1: string = "Keine Informationnen";
    sessionComment2: string = "Keine Informationnen"
    sessionComment3: string = "Keine Informationnen"
    section: string = "";
    type: string = "";
    projectType: string = "";
    projectKind: string = "";
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
    roadWorkActivityNo?: string;
    dateSks?: Date;
    dateSksReal?: Date;
    dateSksPlanned?: Date;
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
    dateConsultStart1?: Date;
    dateConsultEnd1?: Date;
    dateConsultStart2?: Date;
    dateConsultEnd2?: Date;
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
    dateStartInconsult1?: Date;
    dateStartVerified1?: Date; 
    dateStartInconsult2?: Date;
    dateStartVerified2?: Date; 
    dateStartReporting?: Date;
    dateStartSuspended?: Date;
    dateStartCoordinated?: Date;
    isSksRelevant?: boolean = true;
    costLastModified?: Date
    costLastModifiedBy?: User
}
