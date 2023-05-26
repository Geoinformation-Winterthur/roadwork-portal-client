/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ConfigurationData } from 'src/model/configuration-data';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {

  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  public getConfigurationData(): Observable<ConfigurationData> {
    let result: Observable<ConfigurationData> =
      this.http.get(environment.apiUrl + "/appconfig/") as Observable<ConfigurationData>;
    return result;
  }

  public updateConfigurationData(confData: ConfigurationData): Observable<ConfigurationData> {
    let result: Observable<ConfigurationData> =
      this.http.put(environment.apiUrl + "/appconfig/", confData) as Observable<ConfigurationData>;
    return result;
  }

}
