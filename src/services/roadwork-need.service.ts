import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RoadWorkNeedFeature } from '../model/road-work-need-feature';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root'
})
export class RoadWorkNeedService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

   getRoadWorkNeeds(id: string = "", summary: boolean = false): Observable<RoadWorkNeedFeature[]> {
    let queryString = "/roadworkneed/";
    if(id !== null && id !== "" || summary) {
      queryString += "?";

    }
    if(id !== null && id !== ""){
      queryString += "uuid="+ id;
      if(summary) {
        queryString += "&";
      }
    }
    if(summary){
      queryString += "summary=true";
    }
     let result: Observable<RoadWorkNeedFeature[]> =
           this.http.get(environment.apiUrl + queryString) as Observable<RoadWorkNeedFeature[]>;
     return result;
   }

  addRoadworkNeed(roadworkNeed? : RoadWorkNeedFeature): Observable<any> {
    let result: Observable<any> = 
          this.http.post<RoadWorkNeedFeature>(environment.apiUrl + "/roadworkneed/", roadworkNeed);
    return result;
  }

  updateRoadWorkNeed(roadworkNeed? : RoadWorkNeedFeature): Observable<any> {
    let result: Observable<any> = 
          this.http.put(environment.apiUrl + "/roadworkneed/", roadworkNeed);
    return result;
  }

}
