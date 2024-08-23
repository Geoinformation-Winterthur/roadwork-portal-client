/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Geoinformation Winterthur. All rights reserved.
 */
export class ConfigurationData{
    public minAreaSize: number = 0;
    public maxAreaSize: number = 0;

    public plannedDatesSks: Date[] = [];
    public plannedDatesKap: Date[] = [];
    public plannedDatesOks: Date[] = [];

    public errorMessage: string = "";
}