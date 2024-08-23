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

  public getConfigurationData(pastDates: boolean = false): Observable<ConfigurationData> {
    let result: Observable<ConfigurationData> =
      this.http.get(environment.apiUrl + "/appconfig/?pastdates=" + pastDates) as Observable<ConfigurationData>;
    return result;
  }

  public updateConfigurationData(configData: ConfigurationData): Observable<ConfigurationData> {
    let result: Observable<ConfigurationData> =
      this.http.put(environment.apiUrl + "/appconfig/", configData) as Observable<ConfigurationData>;
    return result;
  }

}
