import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { ErrorMessage } from 'src/model/error-message';


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

  deleteRoadWorkActivity(uuid: string): Observable<ErrorMessage> {
    let result: Observable<ErrorMessage> = 
        this.http.delete(environment.apiUrl + "/roadworkactivity?uuid=" + uuid) as Observable<ErrorMessage>;
    return result;
  }

}
