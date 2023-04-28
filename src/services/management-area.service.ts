/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FeatureCollection } from 'src/model/feature-collection';

@Injectable({
  providedIn: 'root'
})
export class ManagementAreaService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

   getManagementAreas(): Observable<FeatureCollection> {
    let queryString = "/managementarea/";
    let result: Observable<FeatureCollection> =
           this.http.get(environment.apiUrl + queryString) as Observable<FeatureCollection>;
     return result;
   }

}
