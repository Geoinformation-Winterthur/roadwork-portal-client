/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { ActivityHistoryItem } from "./activity-history-item";
import { DocumentAttributes } from "./document-attributes";
import { User } from "./user";
import { RoadWorkApprovals } from "./road-work-approvals";

export class RoadWorkActivityProperties {
    uuid: string = "";
    name: string = "";
    projectManager: User = new User();
    trafficAgent: User = new User();
    areaManager: User = new User();
    approvals: RoadWorkApprovals = new RoadWorkApprovals();
    description: string = "";
    comment: string = "";
    sessionComment1: string = "Keine Informationnen";
    sessionComment2: string = "Keine Informationnen";    
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
    sksNo?: number | null;
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
    isTrafficRegulationRequired: boolean = false;
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

    // Aggloprogramm (#617, 2026.4)
    partOfAggloprogram: boolean = false;
    aggloprogramGeneration?: number;
    aggloprogramLink: string = "";
    aggloprogramAreCode: string = "";
    aggloprogramAreDescription: string = "";
    aggloprogramDueDate?: Date
    aggloprogramCostTotal?: number;
    aggloprogramCostCanton?: number;

    // Prestudy (#621, 2026.4)
    prestudyRequired: boolean = false;
    //prestudyRequiredChangedAfterSks: boolean = false;
    prestudyDuration: string = "";
    prestudyContractor: string = "";
    prestudyDetail: string = "";
    prestudyVkErConfirmed?: Date
    prestudyVkErNumber?: number;

    // Affected entities (#622, 2026.4)
    busStopsSheltersAffected: boolean = false;
    structuresAffected: boolean = false;
    roadDrainageAffected: boolean = false;
    houseConnectionsAffected: boolean = false;
    wasteFacilitiesAffected: boolean = false;
    technicalInstallationsAffected: boolean = false;
    treesAffected: boolean = false;
    streetFurnitureAffected: boolean = false;
    urbanClimateAffected: boolean = false;
    subjectToDepaving: boolean = false;
    pedestriansCyclingAffected: boolean = false;
    disabilityEqualityAffected: boolean = false;
    trafficRegulationAffected: boolean = false;

    // Private entities (#623, 2026.4)
    privateEntityAffected: boolean = false;
    privateEntityExtent: string = "";
    privateEntityRequirements: string = "";
    privateEntityAcquisition: boolean = false;
    privateEntityIsInitiator: boolean = false;

    // Provis (Abacus) (#624, 2026.4)
    erpNumber?: number;

    // Ressources (#625, 2026.4)
    staffResourcesAprConfirmed?: Date
    costEstimateAprConfirmed?: Date

    // Engineering contract (#626, 2026.4)
    coreDrillingContracted: boolean = false;
    quotesRequested: boolean = false;
    quotesReviewed: boolean = false;
    aprChecked: boolean = false;
    afmChecked: boolean = false;

    // Approval and filing (#626, 2026.4)
    cfDone: boolean = false;
    rdDone: boolean = false;
    approved: boolean = false;
    fabasoftDone: boolean = false;
    gisUpdated: boolean = false;

    // Additional attributes for journal (#616, 2026.4)
    plannedTasks: string = "";
    constraintsDependencies: string = "";
    acquisitionPlanned: string = "NO"; // Valid values: YES, NO, MAYBE
}
