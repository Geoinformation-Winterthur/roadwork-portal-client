/**
 * @author Simon Meyer (GEOBOX AG)
 * @copyright Copyright (c) Stadt Winterthur. All rights reserved.
 */

import { ActivityResponsibilityProperties } from "./activity-responsibility-properties";

export class ActivityResponsibilityFeature {
    type: string = "ActivityResponsibilityFeature";

    constructor(
        public errorMessage: string = "",
        public properties: ActivityResponsibilityProperties = new ActivityResponsibilityProperties()
    ) { }

    static fromJson(json: any): ActivityResponsibilityFeature {
        return new ActivityResponsibilityFeature(
            json?.errorMessage,
            ActivityResponsibilityProperties.fromJson(json?.properties)
        );
    }
}