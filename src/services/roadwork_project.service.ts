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

  getConstructionProjectsNames(): Observable<string[]> {
    let result: Observable<string[]> =
          this.http.get(environment.apiUrl + "/constructionproject/onlynames") as Observable<string[]>;
    return result;
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

  postRoadworkProject(roadworkProject : RoadWorkProjectFeature): Observable<any> {
    let result: Observable<any> = 
          this.http.post<RoadWorkProjectFeature>(environment.apiUrl + "/constructionproject/", roadworkProject);
    return result;
  }

  putRoadWorkProject(projectId: number, coordinates: number[]): Observable<any> {
    let result: Observable<any> = 
          this.http.put<number[]>(environment.apiUrl + "/roadworkproject/?projectid=" + projectId, coordinates);
    return result;
  }

  public activateSelectedRoadWorkProjectFromLocalStorage() {
  }

  public clearSelectedRoadWorkProject() {
  }


}
