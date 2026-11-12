/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkActivityProperties } from 'src/model/road-work-activity-properties';
import { ErrorMessage } from 'src/model/error-message';
import { EnumType } from 'src/model/enum-type';

export interface ResumeActivityResponse {
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoadWorkActivityService {

  http: HttpClient;
  private baseUrl = environment.apiUrl;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getRoadWorkActivities({
    id, status, summary = false, isMinorWorks
  }: {
    id?: string; status?: string; summary?: boolean; isMinorWorks?: boolean
  }  = {}):
    Observable<RoadWorkActivityFeature[]> {
    let queryString = "/roadworkactivity/";
    if (id || status || summary || isMinorWorks) {
      queryString += "?";
    }
    if (id) {
      // id is set >> only one activity >> other parameters (filters) than summary make no sense
      queryString += "uuid=" + id;
      if (summary) {
        queryString += "&summary=true";
      }
    } else {
      // id is not set >> combine the other parameters
      let parameters: string[] = [];
      if (status) {
        parameters.push("status=" + status);
      }
      if (summary) {
        parameters.push("summary=true");
      }
      if (isMinorWorks != null) {
        parameters.push("isMinorWorks=" + isMinorWorks);
      }
      queryString += parameters.join('&');
    }
    let result: Observable<RoadWorkActivityFeature[]> =
      this.http.get(environment.apiUrl + queryString) as Observable<RoadWorkActivityFeature[]>;
    return result;
  }

  getProjectTypes(): Observable<EnumType[]> {
    let result: Observable<EnumType[]> =
      this.http.get(environment.apiUrl + "/roadworkactivity/projecttypes/") as Observable<EnumType[]>;
    return result;
  }

  addRoadworkActivity(roadworkActivity?: RoadWorkActivityFeature): Observable<RoadWorkActivityFeature> {
    let result: Observable<any> =
      this.http.post<RoadWorkActivityFeature>(environment.apiUrl + "/roadworkactivity/", 
                roadworkActivity) as Observable<RoadWorkActivityFeature>;
    return result;
  }

  updateRoadWorkActivity(roadworkActivity?: RoadWorkActivityFeature): Observable<RoadWorkActivityFeature> {
    const roadworkActivityWithoutHistory = roadworkActivity ? {
      ...roadworkActivity,
      properties: { ...roadworkActivity.properties }
    } : roadworkActivity;

    if (roadworkActivityWithoutHistory) {
      delete (roadworkActivityWithoutHistory.properties as Partial<RoadWorkActivityProperties>).activityHistory;
    }

    let result: Observable<any> =
      this.http.put<RoadWorkActivityFeature>(environment.apiUrl + "/roadworkactivity/",
                roadworkActivityWithoutHistory) as Observable<RoadWorkActivityFeature>;
    return result;
  }

  registerTrafficManager(roadworkActivity?: RoadWorkActivityFeature): Observable<RoadWorkActivityFeature> {
    let result: Observable<RoadWorkActivityFeature> = this.http
        .put<RoadWorkActivityFeature>(environment.apiUrl + "/roadworkactivity/registertrafficmanager/",
                roadworkActivity) as Observable<RoadWorkActivityFeature>;
    return result;
  }

  deleteRoadWorkActivity(uuid: string, deleteReason: string = ""): Observable<ErrorMessage> {
    let result: Observable<ErrorMessage> =
      this.http.delete(environment.apiUrl + "/roadworkactivity?uuid=" +
        uuid + "&deletereason=" + deleteReason) as Observable<ErrorMessage>;
    return result;
  }

  resumeActivity(uuid: string): Observable<ResumeActivityResponse> {
    return this.http.put<ResumeActivityResponse>(
      `${this.baseUrl}/Roadworkactivity/Resume/`,
      { uuid }
    );
  }

}
