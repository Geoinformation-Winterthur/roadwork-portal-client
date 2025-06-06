/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { ErrorMessage } from 'src/model/error-message';
import { EnumType } from 'src/model/enum-type';


@Injectable({
  providedIn: 'root'
})
export class RoadWorkActivityService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getRoadWorkActivities(id: string = "", status: string = "", summary: boolean = false):
    Observable<RoadWorkActivityFeature[]> {
    let queryString = "/roadworkactivity/";
    if ((id !== null && id !== "") || (status !== null && status !== "") || summary) {
      queryString += "?";
    }
    if (id !== null && id !== "") {
      queryString += "uuid=" + id;
      if (summary) {
        queryString += "&";
      }
    } else if (status !== null && status !== "") {
      queryString += "status=" + status;
      if (summary) {
        queryString += "&";
      }
    }
    if (summary) {
      queryString += "summary=true";
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
    let result: Observable<any> =
      this.http.put<RoadWorkActivityFeature>(environment.apiUrl + "/roadworkactivity/",
                roadworkActivity) as Observable<RoadWorkActivityFeature>;
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

}
