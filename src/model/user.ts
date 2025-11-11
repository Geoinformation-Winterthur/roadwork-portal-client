/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { OrganisationalUnit } from "./organisational-unit";
import { Role } from "./role";

export class User {
    uuid: string = "";
    lastName: string = "";
    firstName: string = "";
    initials: string = "";
    mailAddress: string = "";
    passPhrase: string = "";
    active: boolean = false;
    prefTableView: boolean = false;
    grantedRoles: Role = new Role();
    chosenRole: string = "";
    organisationalUnit: OrganisationalUnit
        = new OrganisationalUnit();
    token: string = "";
    errorMessage: string = "";
    isDistributionList: boolean = false;
    isParticipantList: boolean = false;
    workArea: string = "";
}
