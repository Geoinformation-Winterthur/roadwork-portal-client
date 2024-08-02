import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ChartEntry } from 'src/model/chart-entry';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getStatistics(statisticsName: string): Observable<ChartEntry[]> {
    let queryString = "/statistics/?statisticsname=" + statisticsName;
    
    let result: Observable<ChartEntry[]> =
      this.http.get(environment.apiUrl + queryString) as Observable<ChartEntry[]>;
    return result;
  }

}
