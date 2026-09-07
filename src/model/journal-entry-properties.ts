/**
 * @author Simon Meyer (GEOBOX AG)
 * @copyright Copyright (c) Stadt Winterthur. All rights reserved.
 */

export class JournalEntryProperties {
    private _originalContent: string;

    constructor(
        public uuid: string = "",
        public uuidRoadworkActivity: string = "",
        public content: string = "",
        public created?: Date,
        public lastModified?: Date,
        public createdByName: string = "",
        public isEditingAllowed: boolean = false,
    ) {
        this._originalContent = content;
    }

    static fromJson(json: any): JournalEntryProperties {
        return new JournalEntryProperties(
            json.uuid,
            json.uuidRoadworkActivity,
            json.content,
            json.created,
            json.lastModified,
            json.createdByName,
            json.isEditingAllowed
        );
    }

    public isChanged(): boolean {
        return this.content != this._originalContent;
    }
}