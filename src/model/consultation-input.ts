/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */

import { User } from "./user";

export class ConsultationInput {
    uuid: string = "";
    lastEdit: Date = new Date(1, 0, 1);
    inputBy: User = new User();
    decline: boolean = false;
    inputText: string = "";
    valuation: number = 0;
    errorMessage: string = "";
}
