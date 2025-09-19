/**
 * Date-related utilities.
 *
 * Notes:
 * - Month differences are computed using year*12 + month arithmetic and
 *   **ignore the day-of-month and time** (i.e., partial months are not counted).
 *   Example: Jan 31 → Feb 1 returns 1; Mar → Feb returns 0 (clamped).
 */
export class DateHelper {

    /**
     * Calculate the number of whole calendar months between two dates.
     * The result is clamped to a minimum of 0 (no negative values).
     *
     * Examples:
     * - 2024-01-15 to 2024-03-02 → 2
     * - 2024-03-10 to 2024-03-28 → 0 (same month)
     * - 2024-03-10 to 2024-02-28 → 0 (negative delta is clamped)
     *
     * @param date1 Start date (earlier date expected for positive results)
     * @param date2 End date (later date expected for positive results)
     * @returns Non-negative integer number of months between `date1` and `date2`
     */
    public static calcMonthDiff(date1: Date, date2: Date): number {
        let result = 0;

        // Convert the year gap to months (e.g., 2025 - 2023 = 2 years → 24 months)
        result = (date2.getFullYear() - date1.getFullYear()) * 12;

        // Subtract the starting month index (0–11)
        result -= date1.getMonth();

        // Add the ending month index (0–11)
        result += date2.getMonth();

        // Clamp negative or zero to 0; otherwise return the computed month count
        return result <= 0 ? 0 : result;
    }

}
