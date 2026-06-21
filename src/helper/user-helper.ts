import { User } from '../model/user';

/**
 * User-related utilities.
 */
export class UserHelper {
    
    /**
     * Checks if a user is member of TBA Winterhthur
     * (depending on the assigned organistional unit). 
     *
     * Examples:
     * - Planung & Koordination (abbreviation: APK) → true
     * - SBB (abbreviation: SBB) → false
     *
     * @param user The user to check
     * @returns true when member of TBA, otherwise false
     */
    public static isTbaUser(user: User): boolean
      {
        const tbaOrganisationalUnits: string[] = ['apr', 'amo', 'aew', 'aes', 'apk', 'abu'];
        return tbaOrganisationalUnits.includes(user.organisationalUnit.abbreviation.toLowerCase());
      }
}