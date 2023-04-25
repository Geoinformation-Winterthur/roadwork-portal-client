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
    role: Role = new Role();
    organisationalUnit: OrganisationalUnit
        = new OrganisationalUnit();
    token: string = "";
}
