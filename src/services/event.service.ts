/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EventFeature } from 'src/model/event-feature';
import { ErrorMessage } from 'src/model/error-message';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getEvents(uuid: string = "", roadWorkActivityUuid: string = "", temporal: boolean = false,
          spatial: boolean = false, summary: boolean = false): Observable<EventFeature[]> {
    let queryString = "/events/";
    if((uuid !== null && uuid !== "")
          || (roadWorkActivityUuid !== null && roadWorkActivityUuid !== "")
          || summary) {
      queryString += "?";
    }
    if(uuid !== null && uuid !== ""){
      queryString += "uuid="+ uuid;
      if(summary) {
        queryString += "&";
      }
    } else if(roadWorkActivityUuid !== null && roadWorkActivityUuid !== ""){
      queryString += "roadworkactivityuuid="+ roadWorkActivityUuid;
      if(temporal) {
        queryString += "&temporal=true";
      }
      if(spatial) {
        queryString += "&spatial=true";
      }
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
      this.http.post(environment.apiUrl + "/events/", event);
    return result;
  }

   updateEvent(event?: EventFeature): Observable<any> {
    let result: Observable<any> =
      this.http.put(environment.apiUrl + "/events/", event);
    return result;
  }

  public deleteEvent(uuid: string): Observable<ErrorMessage> {
    let result: Observable<ErrorMessage> =
      this.http.delete(environment.apiUrl + "/events?uuid=" + uuid) as Observable<ErrorMessage>;
    return result;
  }

}
