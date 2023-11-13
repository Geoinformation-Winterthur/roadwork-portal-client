/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */

export class ActivityHistoryItem {
    uuid: string = "";
    lastName: string = "";
    changeDate: Date = new Date(1, 0, 1);
    who: string = "";
    what: string = "";
    userComment: string = "";
}
