export class StatusHelper {

    private static statusOrder = [
        "requirement",
        "review",
        "inconsult1",        
        "verified1",
        "inconsult2",
        "verified2",
        "reporting",
        "prestudy",
        "coordinated",
        "suspended"
    ];

    /**
     * Determines whether a given status (`realStatus`) is later in the workflow
     * compared to a reference status (`referenceStatus`).
     *
     * The statuses are evaluated based on a predefined order:
     * ["requirement", "review", "inconsult1", "verified1", "inconsult2", "verified2", "reporting", "prestudy", "coordinated", "suspended"].
     *
     * If `realStatus` appears later in this sequence than `referenceStatus`, the method returns `true`.
     * Otherwise, it returns `false`.
     *
     * @param {string} realStatus - The actual status to be compared.
     * @param {string} referenceStatus - The reference status to compare against.
     * @returns {boolean} - `true` if `realStatus` is later than `referenceStatus`, otherwise `false`.
     * @throws {Error} - If either `realStatus` or `referenceStatus` is not a valid status.
     */
    public isStatusLater(realStatus: string, referenceStatus: string): boolean {
        const realIndex = StatusHelper.statusOrder.indexOf(realStatus);
        const referenceIndex = StatusHelper.statusOrder.indexOf(referenceStatus);

        if (realIndex === -1 || referenceIndex === -1) {
            return true;
        }

        return realIndex > referenceIndex;
    }

    /**
     * Determines whether a given status (`realStatus`) is earlier in the workflow
     * compared to a reference status (`referenceStatus`).
     *
     * This method reuses `isStatusLater` by swapping the parameters.
     *
     * @param {string} realStatus - The actual status to be compared.
     * @param {string} referenceStatus - The reference status to compare against.
     * @returns {boolean} - `true` if `realStatus` is earlier than `referenceStatus`, otherwise `false`.
     * @throws {Error} - If either `realStatus` or `referenceStatus` is not a valid status.
     */
    public isStatusEarlier(realStatus: string, referenceStatus: string): boolean {
        return this.isStatusLater(referenceStatus, realStatus);
    }

}