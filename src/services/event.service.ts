/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EventFeature } from 'src/model/event-feature';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getEvents(id: string = "", summary: boolean = false, roadWorkActivityUuid: string = ""): Observable<EventFeature[]> {
    let queryString = "/events/";
    if((id !== null && id !== "")
          || (roadWorkActivityUuid !== null && roadWorkActivityUuid !== "")
          || summary) {
      queryString += "?";
    }
    if(id !== null && id !== ""){
      queryString += "uuid="+ id;
      if(summary) {
        queryString += "&";
      }
    } else if(roadWorkActivityUuid !== null && roadWorkActivityUuid !== ""){
      queryString += "roadworkactivityuuid="+ roadWorkActivityUuid;
      if(summary) {
        queryString += "&";
      }
    }
    if(summary){
      queryString += "summary=true";
    }
     let result: Observable<EventFeature[]> =
           this.http.get(environment.apiUrl + queryString) as Observable<EventFeature[]>;
     return result;
   }

   addEvent(event?: EventFeature): Observable<any> {
    let result: Observable<any> =
      this.http.post(environment.apiUrl + "/event/", event);
    return result;
  }

   updateEvent(event?: EventFeature): Observable<any> {
    let result: Observable<any> =
      this.http.put(environment.apiUrl + "/event/", event);
    return result;
  }

}
