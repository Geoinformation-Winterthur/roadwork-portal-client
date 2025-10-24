/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */

export class SessionData {     
    plannedDate:  Date = new Date();
    sksNo: number = 0;
    acceptance1: string = "-";    
    attachments: string = "-";   
    miscItems: string = "-";    
    errorMessage: string = "";
    sessionCreator  : string = "";    
    presentUserIds: string = "";
    distributionUserIds: string = "";
}