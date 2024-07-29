import { RoadWorkActivityFeature } from "src/model/road-work-activity-feature";

export class StatusHelper {

    public isStatusLater(realStatus: string, referenceStatus: string): boolean {
        if (realStatus) {
            if (referenceStatus == "requirement") {
                return true;
            } else if (referenceStatus == "review") {
                if (realStatus != "requirement")
                    return true;
            } else if (referenceStatus == "inconsult") {
                if (realStatus != "inconsult" &&
                    realStatus != "requirement" &&
                    realStatus != "review")
                    return true;
            } else if (referenceStatus == "verified") {
                if (realStatus == "reporting" ||
                    realStatus == "coordinated" ||
                    realStatus == "suspended")
                    return true;
            } else if (referenceStatus == "reporting") {
                if (realStatus == "coordinated" ||
                    realStatus == "suspended")
                    return true;
            } else if (referenceStatus == "coordinated") {
                if (realStatus == "suspended")
                    return true;
            } else if (referenceStatus == "suspended") {
                return false;
            }
        }
        return false;
    }

}