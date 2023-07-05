/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { ErrorMessage } from 'src/model/error-message';
import { Status } from 'src/model/status';


@Injectable({
  providedIn: 'root'
})
export class StatusService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getAllStatusTypes(): Observable<Status[]> {
    let result: Observable<Status[]> =
      this.http.get(environment.apiUrl + "/statustypes/") as Observable<Status[]>;
    return result;
  }

}
