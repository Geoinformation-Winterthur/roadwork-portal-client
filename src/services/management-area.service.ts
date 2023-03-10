import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ManagementAreaFeature } from 'src/model/management-area-feature';


@Injectable({
  providedIn: 'root'
})
export class ManagementAreaService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

   getManagementAreas(): Observable<ManagementAreaFeature[]> {
    let queryString = "/managementarea/";
    let result: Observable<ManagementAreaFeature[]> =
           this.http.get(environment.apiUrl + queryString) as Observable<ManagementAreaFeature[]>;
     return result;
   }

}
