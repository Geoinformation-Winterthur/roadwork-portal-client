/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FeatureCollection } from 'src/model/feature-collection';
import { ManagementArea } from 'src/model/management-area';
import { RoadworkPolygon } from 'src/model/road-work-polygon';

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
    queryString = environment.apiUrl + queryString;
    let result: Observable<FeatureCollection> =
           this.http.get(queryString) as Observable<FeatureCollection>;
     return result;
   }

   getIntersectingManagementAreas(roadWorkPoly: RoadworkPolygon): Observable<ManagementArea[]> {
    let result: Observable<ManagementArea[]> = new Observable<ManagementArea[]>();
    if (roadWorkPoly !== null) {
      result = this.http.post(environment.apiUrl + "/managementarea/", roadWorkPoly) as Observable<ManagementArea[]>;
    }
    return result;
  }

   updateManagementArea(managementArea: ManagementArea): Observable<ManagementArea> {
    let result: Observable<ManagementArea> =
      this.http.put(environment.apiUrl + "/managementarea/", managementArea) as Observable<ManagementArea>;
    return result;
  }

}
