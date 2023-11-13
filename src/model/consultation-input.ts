/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */

import { User } from "./user";

export class ConsultationInput {
    uuid: string = "";
    lastEdit: Date = new Date(1, 0, 1);
    typeOfInput: string = "";
    inputBy: User = new User();
    decline: boolean = false;
    inputText: string = "";
    errorMessage: string = "";
}
