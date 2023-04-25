import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';


@Injectable({
  providedIn: 'root'
})
export class RoadWorkActivityService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

   getRoadWorkActivities(id: string = "", summary: boolean = false): Observable<RoadWorkActivityFeature[]> {
    let queryString = "/roadworkactivity/";
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
     let result: Observable<RoadWorkActivityFeature[]> =
           this.http.get(environment.apiUrl + queryString) as Observable<RoadWorkActivityFeature[]>;
     return result;
   }

  addRoadworkActivity(roadworkActivity? : RoadWorkActivityFeature): Observable<any> {
    let result: Observable<any> = 
          this.http.post<RoadWorkActivityFeature>(environment.apiUrl + "/roadworkactivity/", roadworkActivity);
    return result;
  }

  updateRoadWorkActivity(roadworkActivity? : RoadWorkActivityFeature): Observable<any> {
    let result: Observable<any> = 
          this.http.put(environment.apiUrl + "/roadworkactivity/", roadworkActivity);
    return result;
  }

}
