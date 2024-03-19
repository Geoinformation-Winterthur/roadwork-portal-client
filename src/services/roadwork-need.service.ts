/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RoadWorkNeedFeature } from '../model/road-work-need-feature';
import { environment } from 'src/environments/environment';
import { ErrorMessage } from 'src/model/error-message';


@Injectable({
  providedIn: 'root'
})
export class RoadWorkNeedService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getRoadWorkNeeds(ids: string[] = [], year: number = 0, name: string = "",
          status: string[] = [], summary: boolean = false): Observable<RoadWorkNeedFeature[]> {
    let queryString = "/roadworkneed/";
    let hasParameters = false;

    if (ids !== null && ids.length !== 0 && ids[0].trim() !== "") {
      hasParameters = true;
      queryString += "?uuids=";
    }

    for (let id of ids) {
      if (id !== null && id.trim() !== "") {
        queryString += id + ",";
      }
    }

    if (year != 0) {
      if (hasParameters) {
        queryString += "&";
      } else {
        queryString += "?";
      }
      hasParameters = true;
      queryString += "year=" + year;
    }

    if (name != "") {
      if (hasParameters) {
        queryString += "&";
      } else {
        queryString += "?";
      }
      hasParameters = true;
      queryString += "name=" + name;
    }
    
    if (status !== null && status.length !== 0
          && status[0].trim() !== "") {
      if (hasParameters) {
        queryString += "&";
      } else {
        queryString += "?";
      }
      hasParameters = true;
      queryString += "status=";
      for(let i = 0; i < status.length; i++){
        queryString += status[i];
        if(status.length > i + 1) queryString += ",";
      }
    }

    if (summary) {
      if (hasParameters) {
        queryString += "&";
      } else {
        queryString += "?";
      }
      queryString += "summary=true";
    }

    let result: Observable<RoadWorkNeedFeature[]> =
      this.http.get(environment.apiUrl + queryString) as Observable<RoadWorkNeedFeature[]>;
    return result;
  }

  getIntersectingRoadWorkNeeds(roadWorkActicityUuid: string): Observable<RoadWorkNeedFeature[]> {
    let result: Observable<RoadWorkNeedFeature[]> = new Observable<RoadWorkNeedFeature[]>();
    if (roadWorkActicityUuid !== null && roadWorkActicityUuid.trim() !== "") {
      let queryString = "/roadworkneed/?roadworkactivityuuid=" + roadWorkActicityUuid;
      result = this.http.get(environment.apiUrl + queryString) as Observable<RoadWorkNeedFeature[]>;
    }
    return result;
  }

  addRoadworkNeed(roadworkNeed?: RoadWorkNeedFeature): Observable<any> {
    let result: Observable<any> =
      this.http.post<RoadWorkNeedFeature>(environment.apiUrl + "/roadworkneed/", roadworkNeed);
    return result;
  }

  updateRoadWorkNeed(roadworkNeed?: RoadWorkNeedFeature): Observable<any> {
    let result: Observable<any> =
      this.http.put(environment.apiUrl + "/roadworkneed/", roadworkNeed);
    return result;
  }

  public deleteRoadWorkNeed(uuid: string, releaseOnly: boolean = false): Observable<ErrorMessage> {
    let result: Observable<ErrorMessage> =
      this.http.delete(environment.apiUrl + "/roadworkneed?uuid=" + uuid +
        "&releaseonly=" + releaseOnly) as Observable<ErrorMessage>;
    return result;
  }

  downloadRoadWorkNeeds() : Observable<string>{
    let queryString = "/exportdata/";
    let result: Observable<string> =
      this.http.get(environment.apiUrl + queryString, {
        responseType: "text"
      }) as Observable<string>;
    return result;
  }

}
