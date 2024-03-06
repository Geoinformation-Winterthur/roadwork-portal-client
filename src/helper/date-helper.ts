export class DateHelper {

    public static calcMonthDiff(date1: Date, date2: Date): number {
        let result = 0;
        result = (date2.getFullYear() - date1.getFullYear()) * 12;
        result -= date1.getMonth();
        result += date2.getMonth();
        return result <= 0 ? 0 : result;
    }

}