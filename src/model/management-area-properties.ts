/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { User } from "./user";

export class ManagementAreaProperties
{
    public uuid: string  = "";
    public manager: User  = new User();
    public substituteManager: User  = new User();
}