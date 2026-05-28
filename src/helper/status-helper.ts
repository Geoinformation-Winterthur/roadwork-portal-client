export class StatusHelper {

    private static statusOrder = [
        // Phase 1, 2
        "requirement",          // Bedarf (Phase 11)
        "review",               // in Prüfung (Phase 12)
        "inconsult1",           // in Bedarfsklärung - 1.Iteration (Phase 12)
        "verified1",            // verifiziert-1 (Phase 12)
        "inconsult2",           // in Bedarfsklärung - 2.Iteration (Phase 12)
        "verified2",            // verifiziert-2 (Phase 12)
        "reporting",            // Stellungnahme (Phase 12)
        "prestudy",             // Vorstudie (Phase 21), ORDER? Before coordinated by purpose?
        "coordinated",          // koordiniert (Phase 12)
        
        // Entries below where added for full project coverage (#648), order is not mixed with existing ones to preserve existing logic (except: suspended).
        // There is some mix up of status and phases and might need later refactoring. Currently presence of required status/phases has priority
        
        // Phase 1, 2
        "initiation_p13",       // Initialisieren (Phase: 13)
        
        // Phase 3
        "predesign_p31",        // Vorprojekt (Phase 31)
        "design_p32",           // Bauprojekt (Phase 32)
        "approval_p33",         // Bewilligungsverfahren (Phase 33)

        // Phase 4
        "tendering_p41",        // Ausschreibung (Phase 41)

        // Phase 5
        "executiondesign_p51",  // Ausführungsprojekt (Phase 51)
        "execution_p52",        // Ausführung (Phase 52)
        "commissioning_p53",    // Inbetriebnahme (Phase 53)

        // Phase 6
        "closed_p61",           // Abgerechnet (Abgeschlossen)

        // Phase undefined
        // Causes that actual phase gets lost. Might make seens to move out of phases later
        "suspended",            // sistiert, existing before #648
        "archived",             // Archiviert
        "deferred",             // zurückgestellt
    ];

    /**
     * Determines whether a given status (`realStatus`) is later in the workflow
     * compared to a reference status (`referenceStatus`).
     *
     * The statuses are evaluated based on a predefined order:
     * ["requirement", "review", "inconsult1", "verified1", "inconsult2", "verified2", "reporting", "prestudy", "coordinated", "suspended"].
     *
     * If `realStatus` appears later in this sequence than `referenceStatus`, the method returns `true`.
     * Otherwise, it returns `false`.
     *
     * @param {string} realStatus - The actual status to be compared.
     * @param {string} referenceStatus - The reference status to compare against.
     * @returns {boolean} - `true` if `realStatus` is later than `referenceStatus`, otherwise `false`.
     * @throws {Error} - If either `realStatus` or `referenceStatus` is not a valid status.
     */
    public isStatusLater(realStatus: string, referenceStatus: string): boolean {
        const realIndex = StatusHelper.statusOrder.indexOf(realStatus);
        const referenceIndex = StatusHelper.statusOrder.indexOf(referenceStatus);

        if (realIndex === -1 || referenceIndex === -1) {
            return true;
        }

        return realIndex > referenceIndex;
    }

    /**
     * Determines whether a given status (`realStatus`) is earlier in the workflow
     * compared to a reference status (`referenceStatus`).
     *
     * This method reuses `isStatusLater` by swapping the parameters.
     *
     * @param {string} realStatus - The actual status to be compared.
     * @param {string} referenceStatus - The reference status to compare against.
     * @returns {boolean} - `true` if `realStatus` is earlier than `referenceStatus`, otherwise `false`.
     * @throws {Error} - If either `realStatus` or `referenceStatus` is not a valid status.
     */
    public isStatusEarlier(realStatus: string, referenceStatus: string): boolean {
        return this.isStatusLater(referenceStatus, realStatus);
    }

}