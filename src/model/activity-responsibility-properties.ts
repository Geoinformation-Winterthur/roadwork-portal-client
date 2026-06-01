/**
 * @author Simon Meyer (GEOBOX AG)
 * @copyright Copyright (c) Stadt Winterthur. All rights reserved.
 */

export class ActivityResponsibilityProperties {
    private _originalUuidOrganisationalUnit: string;
    private _originalUuidUser: string;
    private _originalPhase: string;
    private _phaseWithOrder: PhaseWithOrder = new PhaseWithOrder();

    constructor(
        public uuid: string = "",
        public uuidRoadworkActivity: string = "",
        public uuidOrganisationalUnit: string = "",
        public uuidUser: string = "",
        public responsibilityType: string = "ProjectLead", // Allowed values: ProjectLead, PhaseLead
        public phase: string = "",
        public sortOrder: number = 0,
    ) {
        this._originalUuidOrganisationalUnit = uuidOrganisationalUnit;
        this._originalUuidUser = uuidUser;
        this._originalPhase = phase;
        this._phaseWithOrder.phase = phase;
        this._phaseWithOrder.sortOrder = sortOrder;
    }

    static fromJson(json: any): ActivityResponsibilityProperties {
        return new ActivityResponsibilityProperties(
            json?.uuid,
            json?.uuidRoadworkActivity,
            json?.uuidOrganisationalUnit,
            json?.uuidUser,
            json?.responsibilityType,
            json?.phase,
            json?.sortOrder
        );
    }
    
    // Used for binding with mat-option
    get phaseWithOrder() {
        return this._phaseWithOrder;
    }

    set phaseWithOrder(value: PhaseWithOrder) {
        this._phaseWithOrder = value;
        this.phase = value.phase;
        this.sortOrder = value.sortOrder;
    }

    public isChanged(): boolean {
        return this._originalUuidOrganisationalUnit != this.uuidOrganisationalUnit
            || this._originalUuidUser != this.uuidUser
            || this._originalPhase != this.phase;
    }
}

export class PhaseWithOrder {
    constructor(
        public phase: string = "",
        public sortOrder: number = 0,
    ) { }
}