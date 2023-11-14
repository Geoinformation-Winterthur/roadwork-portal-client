import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ErrorMessage } from 'src/model/error-message';
import { OrganisationalUnit } from 'src/model/organisational-unit';

@Injectable({
  providedIn: 'root'
})
export class OrganisationService {

  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  public getAllOrgTypes(withContactPerson: boolean = false): Observable<OrganisationalUnit[]> {
    let requestUrl = environment.apiUrl + "/account/organisations/";
    if(withContactPerson)
      requestUrl += "?withcontactperson=true"
    let result: Observable<OrganisationalUnit[]> =
      this.http.get(requestUrl) as Observable<OrganisationalUnit[]>;
    return result;
  }

  public addOrganisation(org: OrganisationalUnit): Observable<any> {
    let result: Observable<any> =
      this.http.post(environment.apiUrl + "/account/organisations/", org) as Observable<any>;
    return result;
  }

  public updateOrganisation(org: OrganisationalUnit): Observable<ErrorMessage> {
    let result: Observable<ErrorMessage> =
      this.http.put(environment.apiUrl + "/account/organisations/", org) as Observable<ErrorMessage>;
    return result;
  }
}
