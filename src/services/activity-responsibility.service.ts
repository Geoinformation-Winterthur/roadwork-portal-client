/**
 * @author Simon Meyer (GEOBOX AG)
 * @copyright Copyright (c) Stadt Winterthur. All rights reserved.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { ActivityResponsibilityFeature } from '../model/activity-responsibility-feature';

@Injectable({
    providedIn: 'root'
})
export class ActivityResponsibilityService {

    http: HttpClient;

    constructor(http: HttpClient) {
        this.http = http;
    }

    async getProjectActivityResponsibility(roadWorkActivityUuid: string = ""): Promise<ActivityResponsibilityFeature> {
        let queryString = "/activityresponsibilities/project-lead";

        if (roadWorkActivityUuid !== null && roadWorkActivityUuid !== "") {
            queryString += "?roadworkactivityuuid=" + roadWorkActivityUuid;
        }

        return await firstValueFrom(this.http.get<ActivityResponsibilityFeature>(environment.apiUrl + queryString).pipe(
            map(ActivityResponsibilityFeature.fromJson)));
    }

    async getPhaseActivityResponsibilities(roadWorkActivityUuid: string = ""): Promise<ActivityResponsibilityFeature[]> {
        let queryString = "/activityresponsibilities/phase-leads";

        if (roadWorkActivityUuid !== null && roadWorkActivityUuid !== "") {
            queryString += "?roadworkactivityuuid=" + roadWorkActivityUuid;
        }

        return await firstValueFrom(this.http.get<ActivityResponsibilityFeature[]>(environment.apiUrl + queryString).pipe(
            map((elem: ActivityResponsibilityFeature[]) => elem.map(ActivityResponsibilityFeature.fromJson))));
    }

    async addActivityResponsibility(activityResponsibility: ActivityResponsibilityFeature): Promise<any> {
        return await firstValueFrom(this.http.post<ActivityResponsibilityFeature>(environment.apiUrl + "/activityresponsibilities/", activityResponsibility));
    }

    async updateActivityResponsibility(activityResponsibility: ActivityResponsibilityFeature): Promise<any> {
        return await firstValueFrom(this.http.put<ActivityResponsibilityFeature>(environment.apiUrl + "/activityresponsibilities/", activityResponsibility));
    }
}
