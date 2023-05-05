/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
export class EventProperties {
    uuid: string = "";
    name: string = "";
    created: Date = new Date(1, 0, 1);
    lastModified: Date = new Date(1, 0, 1);
    dateFrom: Date = new Date(1, 0, 1);
    dateTo: Date = new Date(1, 0, 1);
}
