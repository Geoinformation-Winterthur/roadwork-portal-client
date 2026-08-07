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
    trafficAgent: User = new User(); // unused
    areaManager: User = new User();
    approvals: RoadWorkApprovals = new RoadWorkApprovals();
    description: string = "";
    comment: string = "";
    sessionComment1: string = "Keine Informationnen";
    sessionComment2: string = "Keine Informationnen";    
    section: string = "";
    type: string = "";
    workingTitle: string = "";
    implementationByThird: boolean = false;
    projectType: string = "";
    projectKind: string = "";
    overarchingMeasure: boolean = false;
    desiredYearFrom: number = -1;
    desiredYearTo: number = -1;
    created: Date = new Date(1,0,1); // System, Modul Termine, Phase1: "Bauvorhaben erfasst"
    lastModified: Date = new Date(1, 0, 1); // System
    finishEarlyTo?: Date; // unused (never a value assigned), Termine Alt: "Frühester Baubeginn"
    finishOptimumTo: Date = new Date(1, 0, 1); // unused (never a value assigned), Termine Alt: "Wunsch Baubeginn"
    finishLateTo?: Date; // unused (never a value assigned), Termine Alt: "Späteste Inbetriebnahme"
    startOfConstruction?: Date; // Modul Termine: "Baubeginn (Voraussichtlich)"
    endOfConstruction?: Date; // Modul Termine: "Bauende (Voraussichtlich)"
    //dateOfAcceptance?: Date;  // removed in #650 (consolidated with dateGuarantee)
    consultDue: Date = new Date(1, 0, 1); // unused
    costs?: number;
    costsType: string = "";
    roadWorkNeedsUuids: string[] = [];
    status: string = "";
    isEditingAllowed: boolean = false;
    isInInternet: boolean = false; // unused
    billingAddress1: string = ""; // unused
    billingAddress2: string = ""; // unused
    investmentNo?: number;
    pdbFid: number = 0; // unused
    strabakoNo: string = "";
    projectNo: string = "";
    roadWorkActivityNo?: string;
    dateSks?: Date; // SKS Berechnet
    dateSksReal?: Date; // Modul Sitzungen, gehnehmigt: "SKS"
    dateSksPlanned?: Date; // Modul Sitzungen, terminiert: "SKS"
    sksNo?: number | null;
    dateKap?: Date; // Modul Sitzungen, berechnet: "KAP"
    dateKapReal?: Date; // Modul Sitzungen, gehnehmigt: "KAP"
    dateOks?: Date; // OKS Berechnet
    dateOksReal?: Date; // Modul Sitzungen, terminiert: "OKS"
    dateGlTba?: Date; // Modul Übersicht
    dateGlTbaReal?: Date; // Modul Termine, Phase1: "Genehmigter Projektierungsauftrag (GL)"
    activityHistory: ActivityHistoryItem[] = [];
    evaluation: number = 0;
    evaluationSks: number = 0;
    isPrivate: boolean = false;
    involvedUsers: User[] = [];
    datePlanned?: Date; // unused
    dateAccept?: Date; // unused
    dateGuarantee?: Date; // Modul Termine, Phase5: "Abnahme/Garantie"
    isStudy: boolean = false;
    isTrafficRegulationRequired: boolean = false;
    dateStudyStart?: Date; // Modul Termine, Phase2: "Auftrag für Vorstudie erarbeiten"
    dateStudyEnd?: Date; // Modul Termine, Phase2: "Genehmigter Auftrag Vorstudie (GL)"
    projectStudyApproved?: Date; // Modul Termine, Phase2: "Vorstudie erarbeiten"
    studyApproved?: Date; // Modul Termine, Phase2: "Genehmigte Vorstudie (GL)"
    //isDesire: boolean = false; // removed in #650
    //dateDesireStart?: Date; // removed in #650
    //dateDesireEnd?: Date; // removed in #650
    isParticip: boolean = false;
    dateParticipStart?: Date; // Modul Termine, Phase3: "Planauflage §13" >> Start
    dateParticipEnd?: Date; // Modul Termine, Phase3: "Planauflage §13" >> End
    isPlanCirc: boolean = false;
    datePlanCircStart?: Date; // Modul Termine, Phase3: "Planauflage §16" >> Start
    datePlanCircEnd?: Date; // Modul Termine, Phase3: "Planauflage §16" >> End
    dateConsultStart1?: Date; // Modul Termine, Phase2: "Bedarfsklärung - 1. Iteration" >> Start
    dateConsultEnd1?: Date; // Modul Termine, Phase2: "Bedarfsklärung - 1. Iteration" >> End
    dateConsultStart2?: Date; // Modul Termine, Phase2: "Bedarfsklärung - 2. Iteration" >> Start
    dateConsultEnd2?: Date; // Modul Termine, Phase2: "Bedarfsklärung - 2. Iteration" >> End
    dateConsultClose?: Date; // Modul Vernehmlassung: "Bedarfsklärung Abschluss"
    dateReportStart?: Date; // Modul Termine, Phase2: "Stellungnahme" >> Start
    dateReportEnd?: Date; // Modul Termine, Phase2: "Stellungnahme" >> End
    dateReportClose?: Date; // Modul Vernehmlassung: "Stellungnahme Abschluss"
    dateDesignAssignmentIssued?: Date; // Modul Termine, Grobplanung: "Projektierungsauftrag erstellt bis"
    dateAprDesignCompletion?: Date; // Modul Termine, Grobplanung: "APR Projektiert bis"
    dateAprConstructionCompletion?: Date; // Modul Termine, Grobplanung, PhaseX: "APR Realisiert bis"
    dateQuotesRequested?: Date; // Modul Termine, Phase1: "Bestellungen" >> Start
    dateQuotesReviewed?: Date; // Modul Termine, Phase1: "Bestellungen" >> End
    datePrepareEdcStart?: Date; // Modul Termine, Phase1: "Projektierungsauftrag erarbeiten" >> Start
    datePrepareEdcEnd?: Date; // Modul Termine, Phase1: "Projektierungsauftrag erarbeiten" >> End
    dateHandoverToApk?: Date; // Modul Termine, Phase2: "Übergabesitzung AMO/AEW an APK"
    dateHandoverToApr?: Date; // Modul Termine, Phase3: "Übergabesitzung APK an APR"
    dateRequestDesignBudget?: Date; // Modul Termine, Phase3: "Projektierungskredit einholen"
    dateProjectApprovalStart?: Date; // Modul Termine, Phase3: "Projektfestsetzung" >> Start
    dateProjectApprovalEnd?: Date; // Modul Termine, Phase3: "Projektfestsetzung" >> End
    dateConstructionBudgetApprovalStart?: Date; // Modul Termine, Phase3: "Ausführungskredit" >> Start
    dateConstructionBudgetApprovalEnd?: Date; // Modul Termine, Phase3: "Ausführungskredit" >> End
    dateSubmissionStart?: Date; // Modul Termine, Phase4: "Submission" >> Start
    dateSubmissionEnd?: Date; // Modul Termine, Phase4: "Submission" >> End
    dateStartOfConstructionReal?: Date; // Modul Termine, Phase5: "Baubeginn/ -ende" >> Beginn
    dateEndOfConstructionReal?: Date; // Modul Termine, Phase5: "Baubeginn/ -ende" >> End
    dateFinalPavementStart?: Date; // Modul Termine, Phase5: "Einbau Deckbelag" >> Start
    dateFinalPavementEnd?: Date; // Modul Termine, Phase5: "Einbau Deckbelag" >> End
    dateProjectBudgetFinalized?: Date; // Modul Termine, Phase5: "Projektkreditabrechnung"
    //dateInfoStart?: Date; // removed in #650
    //dateInfoEnd?: Date; // removed in #650
    //dateInfoClose?: Date; // removed in #650
    isAggloprog: boolean = false;
    url: string = "";
    documentAtts?: DocumentAttributes[];
    dateStartInconsult1?: Date; // unused, Phase: in Bedarfsklärung - 1.Iteration (Phase 12)
    dateStartVerified1?: Date;  // Phase: verifiziert-1 (Phase 12)
    dateStartInconsult2?: Date; // unused, Phase: in Bedarfsklärung - 2.Iteration (Phase 12)
    dateStartVerified2?: Date;  // unused, Phase: verifiziert-2 (Phase 12)
    dateStartReporting?: Date; // Phase: Stellungnahme (Phase 12)
    dateStartSuspended?: Date; // unused, Phase: sistiert
    dateStartCoordinated?: Date; // Phase: koordiniert (Phase 12)
    isOksActive?: boolean = false;
    isOksActiveLastModified?: Date // System & Export only
    costLastModified?: Date // System & Export only
    costLastModifiedBy?: User

    // Aggloprogramm (#617, 2026.4)
    partOfAggloprogram: boolean = false;
    aggloprogramGeneration?: number;
    aggloprogramLink: string = "";
    aggloprogramAreCode: string = "";
    aggloprogramAreDescription: string = "";
    aggloprogramDueDate?: Date // Modul Journal, Agglo: "Umzusetzen bis"
    aggloprogramCostTotal?: number;
    aggloprogramCostCanton?: number;

    // Prestudy
    prestudy: boolean = false;
    // Prestudy additional (#663, 2026.9)
    prestudySks: boolean = false;
    // Prestudy additional (#621, 2026.4)
    prestudyDuration: string = "";
    prestudyContractor: string = "";
    prestudyDetail: string = "";
    prestudyVkErConfirmed?: Date // Modul Journal: "Finanzielle Ressourcen für Phase 2 (VK ER) abgesprochen.."
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

    // Private entities (#623, 2026.4)
    privateEntityAffected: boolean = false;
    privateEntityExtent: string = "";
    privateEntityRequirements: string = "";
    privateEntityAcquisition: boolean = false;
    privateEntityIsInitiator: boolean = false;

    // Provis (Abacus) (#624, 2026.4)
    erpNumber?: number;

    // Ressources (#625, 2026.4)
    staffResourcesAprConfirmed?: Date // Modul Journal: "Personelle Ressourcen APR (ab Phase 3) abgesprochen"
    costEstimateAprConfirmed?: Date // Modul Journal: "Journal >> "Kostenschätzung mit APR (Phase 3 bis 5) abgesprochen"

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
