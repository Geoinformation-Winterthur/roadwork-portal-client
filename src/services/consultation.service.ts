import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ConsultationInput } from 'src/model/consultation-input';

@Injectable({
  providedIn: 'root'
})
export class ConsultationService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getConsultationInputs(roadworkActivityUuid: string): Observable<ConsultationInput[]> {
    let queryString = "/consultation/?roadworkactivityuuid=" + roadworkActivityUuid;
    
    let result: Observable<ConsultationInput[]> =
      this.http.get(environment.apiUrl + queryString) as Observable<ConsultationInput[]>;
    return result;
  }

  addConsultationInput(roadworkActivityUuid: string, consultationInput: ConsultationInput): 
            Observable<ConsultationInput> {
    let result: Observable<any> =
      this.http.post(environment.apiUrl + "/consultation/?roadworkactivityuuid=" + roadworkActivityUuid,
            consultationInput);
    return result;
  }

  updateConsultationInput(roadworkActivityUuid: string, consultationInput: ConsultationInput): Observable<ConsultationInput> {
    let result: Observable<any> =
      this.http.put(environment.apiUrl + "/consultation/?roadworkactivityuuid=" + roadworkActivityUuid,
            consultationInput);
    return result;
  }

}
