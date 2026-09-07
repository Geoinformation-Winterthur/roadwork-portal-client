/**
 * @author Simon Meyer (GEOBOX AG)
 * @copyright Copyright (c) Stadt Winterthur. All rights reserved.
 */

import { JournalEntryProperties } from "./journal-entry-properties";

export class JournalEntryFeature {
    type: string = "JournalEntryFeature";

    constructor(
        public errorMessage: string = "",
        public properties: JournalEntryProperties = new JournalEntryProperties()
    ) { }

    static fromJson(json: any): JournalEntryFeature {
        return new JournalEntryFeature(
            json.errorMessage,
            JournalEntryProperties.fromJson(json.properties)
        );
    }
}