/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */

export class SessionData {     
    plannedDate: Date = new Date();
    reportType: string = "";
    dateType: string = "";
    sksNo: number = 0;

    acceptance1: string = "-";    
    attachments: string = "-";   
    miscItems: string = "-";    

    presentUserIds: string = "";
    distributionUserIds: string = "";

    location: string = "";
    timeWindow: string = "";
    chairperson: string = "";
    minuteTaker: string = "";

    errorMessage: string = "";
    sessionCreator: string = "";    
}