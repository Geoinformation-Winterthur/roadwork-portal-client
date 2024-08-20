import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Address } from 'src/model/address';

@Injectable({
  providedIn: 'root'
})
export class AddressService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getAddressList(searchString: string): Observable<Address[]> {
    let queryString = "/address/?search=" + searchString;    
    let result: Observable<Address[]> =
      this.http.get(environment.apiUrl + queryString) as Observable<Address[]>;
    return result;
  }

  getCoordinateOfAddress(searchString: string): Observable<string[]> {
    let queryString = "/address/?getcoord=" + searchString;    
    let result: Observable<string[]> =
      this.http.get(environment.apiUrl + queryString) as Observable<string[]>;
    return result;
  }

}
