interface PhaseInfo {
  phase: string;
  color: string;
  label: string;
  text: string;
}

export class StatusHelper {

    private static orderedStatuses: Record<string, PhaseInfo> = {
        // Status / Phase 1, 2
        requirement:                { phase: '11', color: '#93e3ff', label: '11/Bedarf',                       text: 'Bedarf (Phase 11)' },
        review:                     { phase: '12', color: '#93e3ff', label: '12/Prüfung',                      text: 'in Prüfung (Phase 12)' },
        inconsult1:                 { phase: '12', color: '#93e3ff', label: '12/Bedarfsklärung - 1.Iteration', text: 'in Bedarfsklärung - 1.Iteration (Phase 12)' },
        verified1:                  { phase: '12', color: '#93e3ff', label: '12/verifiziert-1',                text: 'verifiziert-1 (Phase 12)' },
        inconsult2:                 { phase: '12', color: '#93e3ff', label: '12/Bedarfsklärung - 2.Iteration', text: 'in Bedarfsklärung - 2.Iteration (Phase 12)' },
        verified2:                  { phase: '12', color: '#93e3ff', label: '12/verifiziert-2',                text: 'verifiziert-2 (Phase 12)' },
        reporting:                  { phase: '12', color: '#93e3ff', label: '12/Stellungnahme',                text: 'Stellungnahme (Phase 12)' },
        prestudy:                   { phase: '21', color: '#3dc3f4', label: '21/Vorstudie',                    text: 'Vorstudie (Phase 21)' }, // ORDER? prestudy before coordinated by purpose?
        coordinated:                { phase: '12', color: '#93e3ff', label: '12/koordiniert',                  text: 'koordiniert (Phase 12)' },

        // Entries below where added for full project coverage (#648), order is not mixed with existing ones to preserve existing logic (except: suspended).
        // There is some mix up of status and phases and might need later refactoring. Currently presence of required status/phases has priority
                
        // Phase 1
        planning_p1:                { phase:  '1', color: '#93e3ff', label: '1/Strategische Planung',          text: 'Strategische Planung (Phase 1)' },
        suspended_after_sks:        { phase: '12', color: '#93e3ff', label: '12/ruhend nach SKS',              text: 'ruhend nach SKS (Phase 12)' },
        initiation_p13:             { phase: '13', color: '#93e3ff', label: '13/Initialisieren',               text: 'Initialisieren (Phase 13)' },

        // Phase 2
        prestudy_p2:                { phase:  '2', color: '#3dc3f4', label: '2/Vorstudie',                     text: 'Vorstudie (Phase 2)' },

        // Phase 3
        design_p3:                  { phase:  '3', color: '#ff9797', label: '3/Projektierung',                 text: 'Projektierung (Phase 3)' },
        predesign_p31:              { phase: '31', color: '#ff9797', label: '31/Vorprojekt',                   text: 'Vorprojekt (Phase 31)' },
        design_p32:                 { phase: '32', color: '#ff9797', label: '32/Bauprojekt',                   text: 'Bauprojekt (Phase 32)' },
        approval_p33:               { phase: '33', color: '#c00000', label: '33/Bewilligungsverfahren',        text: 'Bewilligungsverfahren (Phase 33)' },

        // Phase 4
        tendering_p4:               { phase:  '4', color: '#a9d08e', label: '4/Ausschreibung',                 text: 'Ausschreibung (Phase 4)' },
        tendering_p41:              { phase: '41', color: '#a9d08e', label: '41/Ausschreibung / Vergabe',      text: 'Ausschreibung / Vergabe (Phase 41)' },

        // Phase 5
        construction_p5:            { phase:  '5', color: '#70ad47', label: '5/Realisierung',                  text: 'Realisierung (Phase 5)' },
        executiondesign_p51:        { phase: '51', color: '#70ad47', label: '51/Ausführungsprojekt',           text: 'Ausführungsprojekt (Phase 51)' },
        execution_p52:              { phase: '51', color: '#70ad47', label: '52/Ausführung',                   text: 'Ausführung (Phase 52)' },
        construction_accounting_p53:{ phase: '53', color: '#70ad47', label: '53/Bauabrechnung',                text: 'Bauabrechnung (Phase 53)' },
        commissioning_p53:          { phase: '53', color: '#70ad47', label: '53/Inbetriebnahme',               text: 'Inbetriebnahme (Phase 53)' },

        // Phase 6
        operations_p6:              { phase:  '6', color: '#ed7d31', label: '6/Bewirtschaftung',               text: 'Bewirtschaftung (Phase 6)' },
        closed_p61:                 { phase: '61', color: '#ed7d31', label: '61/Abgerechnet',                  text: 'Abgerechnet (Abgeschlossen, Phase 61)' },

        // Status / Phase undefined
        // Causes that actual phase gets lost. Might make seens to move out of phases later
        suspended:                  { phase:   '', color: '#e0e0e0', label: 'sistiert',                        text: 'sistiert' },
        archived:                   { phase:   '', color: '#e0e0e0', label: 'Archiviert',                      text: 'Archiviert' },
        need_archived:              { phase:   '', color: '#e0e0e0', label: 'Bedarf archiviert',               text: 'Bedarf archiviert' },
        deferred:                   { phase:   '', color: '#e0e0e0', label: 'zurückgestellt',                  text: 'zurückgestellt' },
    };

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
        const orderedStatusKeys = Object.keys(StatusHelper.orderedStatuses);
        const realIndex = orderedStatusKeys.indexOf(realStatus);
        const referenceIndex = orderedStatusKeys.indexOf(referenceStatus);

        if (realIndex === -1 || referenceIndex === -1) {
            return true;
        }

        return realIndex > referenceIndex;
    }

    /**
     * Get the matching status numbers of the status keys. 
     * 
     * @param {string} statusKey - The status key as string
     * @returns {string} - The phase number as string (e.g. "12")
     */
    public getPhaseNumberFromKey(statusKey: string) {
        if (!statusKey) {
            return undefined;
        }

        return StatusHelper.orderedStatuses[statusKey]?.phase;
    }

    /**
     * Returns an array whit all status for display in drop-downs etc.
     * @returns { key: string; info: PhaseInfo }[] - Array with all status (keys and values with text, color, etc.)
     */
    public static getStatuses(): { key: string; info: PhaseInfo }[] {
        return Object.entries(this.orderedStatuses)
            .map(([key, info]) => ({ key, info }));
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
        // parameter order is switched to get inverted value of isStatusLater
        return this.isStatusLater(referenceStatus, realStatus);
    }
}