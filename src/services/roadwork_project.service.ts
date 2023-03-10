import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RoadWorkProjectFeature } from '../model/road-work-project-feature';
import { environment } from 'src/environments/environment';


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

  getConstructionProjectByPlace(name : string): Observable<RoadWorkProjectFeature> {
    let result: Observable<RoadWorkProjectFeature> = 
              this.http.get(environment.apiUrl + "/constructionproject/byplace?place=" + name) as Observable<RoadWorkProjectFeature>;
    return result;
  }

  addRoadworkProject(roadworkProject : RoadWorkProjectFeature): Observable<any> {
    let result: Observable<any> = 
          this.http.post<RoadWorkProjectFeature>(environment.apiUrl + "/roadworkporject/", roadworkProject);
    return result;
  }

  updateRoadWorkProject(roadworkProject? : RoadWorkProjectFeature): Observable<any> {
    let result: Observable<any> = 
          this.http.put(environment.apiUrl + "/roadworkproject/", roadworkProject);
    return result;
  }

  public activateSelectedRoadWorkProjectFromLocalStorage() {
  }

  public clearSelectedRoadWorkProject() {
  }


}
