import { OrganisationalUnit } from "./organisational-unit";
import { Role } from "./role";

export class User {
    uuid: string = "";
    lastName: string = "";
    firstName: string = "";
    initials: string = "";
    mailAddress: string = "";
    passPhrase: string = "";
    role: Role = new Role();
    organisationalUnit: OrganisationalUnit
        = new OrganisationalUnit();
    token: string = "";
}
