/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Geoinformation Winterthur. All rights reserved.
 */
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  getDocument(uuid: string, type: string): Observable<any> {
    let head: HttpHeaders = new HttpHeaders();
    head = head.set("Accept", "application/pdf");
    let result: Observable<any> = this.http.get(environment.apiUrl +
      "/" + type + "/" + uuid + "/pdf/",
      { headers: head, responseType: "blob" }) as Observable<any>;
    return result;
  }

  uploadDocument(uuid: string, pdfFile: FormData, type: string): Observable<any> {
    let head: HttpHeaders = new HttpHeaders();
    head = head.set("enctype", "multipart/form-data");
    let result: Observable<any> =
      this.http.post<FormData>(environment.apiUrl + "/" + type + "/" + uuid + "/pdf/",
        pdfFile,
        { headers: head });
    return result;
  }

  deleteDocument(uuid: string, type: string): Observable<any> {
    let head: HttpHeaders = new HttpHeaders();
    let result: Observable<any> =
      this.http.delete(environment.apiUrl + "/" + type + "/" + uuid + "/pdf/");
    return result;
  }

}
