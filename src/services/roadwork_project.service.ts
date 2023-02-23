import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConstructionProjectFeature } from '../model/construction-project-feature';
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

   getConstructionProjectsSummaries(): Observable<ConstructionProjectFeature[]> {
     let result: Observable<ConstructionProjectFeature[]> =
           this.http.get(environment.apiUrl + "/constructionproject/summaries") as Observable<ConstructionProjectFeature[]>;
     return result;
   }

   getConstructionProjectById(id : number): Observable<ConstructionProjectFeature> {
    let result: Observable<ConstructionProjectFeature> = 
              this.http.get(environment.apiUrl + "/constructionproject/byid?id=" + id) as Observable<ConstructionProjectFeature>;
    return result;
  }

  getConstructionProjectByPlace(name : string): Observable<ConstructionProjectFeature> {
    let result: Observable<ConstructionProjectFeature> = 
              this.http.get(environment.apiUrl + "/constructionproject/byplace?place=" + name) as Observable<ConstructionProjectFeature>;
    return result;
  }

  getGeometry(projectId : number): Observable<number[]> {
    let result: Observable<number[]> = 
              this.http.get(environment.apiUrl + "/constructionproject/geometry?projectid=" + projectId) as Observable<number[]>;
    return result;
  }

  postRoadworkProject(roadworkProject : ConstructionProjectFeature): Observable<any> {
    let result: Observable<any> = 
          this.http.post<ConstructionProjectFeature>(environment.apiUrl + "/constructionproject/", roadworkProject);
    return result;
  }

  postGeometry(projectId: number, coordinates: number[]): Observable<any> {
    let result: Observable<any> = 
          this.http.post<number[]>(environment.apiUrl + "/constructionproject/geometry?projectid=" + projectId, coordinates);
    return result;
  }

  public activateSelectedRoadWorkProjectFromLocalStorage() {
  }

  public clearSelectedRoadWorkProject() {
  }


}
