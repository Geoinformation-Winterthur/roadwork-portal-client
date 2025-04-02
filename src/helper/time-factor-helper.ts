import { RoadWorkNeedFeature } from "src/model/road-work-need-feature";

export class TimeFactorHelper {

    public static calcTimeFactor(compareNeed: RoadWorkNeedFeature, primaryNeed: RoadWorkNeedFeature): number {
        if (compareNeed && primaryNeed) {
            if (compareNeed.properties.finishEarlyTo)
                compareNeed.properties.finishEarlyTo = new Date(compareNeed.properties.finishEarlyTo);
            if (compareNeed.properties.finishOptimumTo)
                compareNeed.properties.finishOptimumTo = new Date(compareNeed.properties.finishOptimumTo);
            if (compareNeed.properties.finishLateTo)
                compareNeed.properties.finishLateTo = new Date(compareNeed.properties.finishLateTo);

            if (primaryNeed.properties.finishEarlyTo)
                primaryNeed.properties.finishEarlyTo = new Date(primaryNeed.properties.finishEarlyTo);
            if (primaryNeed.properties.finishOptimumTo)
                primaryNeed.properties.finishOptimumTo = new Date(primaryNeed.properties.finishOptimumTo);
            if (primaryNeed.properties.finishLateTo)
                primaryNeed.properties.finishLateTo = new Date(primaryNeed.properties.finishLateTo);

            if (compareNeed.properties.finishEarlyTo.getTime() > primaryNeed.properties.finishLateTo.getTime())
                return 1;
            if (compareNeed.properties.finishEarlyTo.getTime() > primaryNeed.properties.finishOptimumTo.getTime()
                || compareNeed.properties.finishOptimumTo.getTime() > primaryNeed.properties.finishOptimumTo.getTime())
                return 2;
            if (compareNeed.properties.finishOptimumTo.getTime() > primaryNeed.properties.finishEarlyTo.getTime()
                || compareNeed.properties.finishLateTo.getTime() > primaryNeed.properties.finishEarlyTo.getTime())
                return 3;
            else
                return 4;
        }
        return 0;
    }
}