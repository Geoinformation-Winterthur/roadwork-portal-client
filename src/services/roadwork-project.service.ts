import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RoadWorkProjectFeature } from 'src/model/road-work-project-feature';


@Injectable({
  providedIn: 'root'
})
export class RoadWorkProjectService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

   getRoadWorkProjects(id: string = "", summary: boolean = false): Observable<RoadWorkProjectFeature[]> {
    let queryString = "/roadworkproject/";
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
     let result: Observable<RoadWorkProjectFeature[]> =
           this.http.get(environment.apiUrl + queryString) as Observable<RoadWorkProjectFeature[]>;
     return result;
   }

}
