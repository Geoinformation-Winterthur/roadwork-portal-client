import { RoadWorkNeedFeature } from "src/model/road-work-need-feature";

export class FilterHelper {

    public static filterRoadWorkNeeds(roadWorkNeedFeatures: RoadWorkNeedFeature[], chosenYear: number): RoadWorkNeedFeature[] {
        return roadWorkNeedFeatures
            .filter(roadWorkNeedFeatures => {
                if (roadWorkNeedFeatures.properties.finishOptimumTo) {
                    let finishOptimumTo: Date = new Date(roadWorkNeedFeatures.properties.finishOptimumTo);
                    return finishOptimumTo.getFullYear() === chosenYear;
                } else {
                    return false;
                }
            });
    }

}