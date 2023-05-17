/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RoadWorkNeedFeature } from '../model/road-work-need-feature';
import { environment } from 'src/environments/environment';
import { RoadWorkNeedEnum } from 'src/model/road-work-need-enum';


@Injectable({
  providedIn: 'root'
})
export class RoadWorkNeedService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getRoadWorkNeeds(ids: string[] = [], summary: boolean = false): Observable<RoadWorkNeedFeature[]> {
    let queryString = "/roadworkneed/";
    let hasIds = false;
    if (ids !== null && ids.length !== 0 && ids[0].trim() !== "") {
      hasIds = true;
      queryString += "?uuids=";
    }

    for (let id of ids) {
      if (id !== null && id.trim() !== "") {
        queryString += id + ",";
      }
    }

    if (summary) {
      if(hasIds){
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

  getAllTypes(): Observable<RoadWorkNeedEnum[]> {
    let result: Observable<RoadWorkNeedEnum[]> =
      this.http.get(environment.apiUrl + "/roadworkneedtypes/") as Observable<RoadWorkNeedEnum[]>;
    return result;
  }

}
