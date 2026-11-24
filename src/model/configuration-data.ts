/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Geoinformation Winterthur. All rights reserved.
 */
export class ConfigurationData{
    public minAreaSize: number = 0;
    public maxAreaSize: number = 0;

    public plannedDatesSks: Date[] | null = [];
    public plannedDatesKks: Date[] | null = [];
    public plannedDatesKap: Date[] = [];
    public plannedDatesOks: Date[] = [];

    public sksNos: number[] = [];
    public kksNos: number[] = [];

    public errorMessage: string = "";
}