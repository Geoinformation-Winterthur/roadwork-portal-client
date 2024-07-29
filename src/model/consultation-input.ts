/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */

import { User } from "./user";

export class ConsultationInput {
    uuid: string = "";
    lastEdit?: Date;
    inputBy: User = new User();
    decline: boolean = false;
    ordererFeedback: string = "";
    managerFeedback: string = "";
    valuation: number = 0;
    feedbackPhase: string = "";
    feedbackGiven: boolean = false;
    errorMessage: string = "";
}
