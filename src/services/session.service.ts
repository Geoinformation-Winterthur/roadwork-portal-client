import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SessionData } from '../model/session';
import { environment } from 'src/environments/environment';


const BASE_URL = `${environment.apiUrl}/Session`;

export interface CreateSessionDto {
  sksNo: number;
  plannedDateForBackend?: string;               // 'DD.MM.YYYY'
  reportType?: string;
  acceptance1?: string;
  attachments?: string;
  miscItems?: string;
  presentUserIds?: string;           // CSV of IDs
  distributionUserIds?: string;      // CSV of IDs
}

export interface SessionDto {
  plannedDate: string;
  sksNo: number;
  reportType: string;
  acceptance1: string;
  attachments: string;
  miscItems: string;
  presentUserIds?: string;
  distributionUserIds?: string;
}

@Injectable({
  providedIn: 'root'
})

export class SessionService {
  http: HttpClient;
  constructor(http: HttpClient) {
     this.http = http;
  }

  /** GET all sessions (ordered by plannedDate desc) */
  getAll(): Observable<SessionData[]> {
    return this.http.get<SessionData[]>(BASE_URL, { withCredentials: true }).pipe(
      map(rows => rows.map(this.parseSession)),
      catchError(this.handleError)
    );
  }

  createSession(dto: CreateSessionDto): Observable<SessionDto> {
    return this.http.post<SessionDto>(`${BASE_URL}`, dto);
  }
  
  // PATCH session details (attachments, acceptance1, miscItems)
  updateSessionDetails(
    sksNo: number | string,
    patch: {
      attachments?: string;
      acceptance1?: string;
      miscItems?: string;
      plannedDate?: string | null;
      palnnedDateForBackend?: string | null;
      reportType?: string | null; 
    }
  ) {
    return this.http.patch(`${BASE_URL}/${sksNo}`, patch);
  }

  // PATCH session users (present, distribution)
  updateSessionUsers(sksNo: number, present: string, distribution: string) {
    return this.http.patch(`${BASE_URL}/${sksNo}/users`, {
      presentUserIds: present,
      distributionUserIds: distribution,
    });
  }


  // Convert string date from API to JS Date
  private parseSession = (row: any): SessionData => ({
    ...row,
    plannedDate: row?.plannedDate ? new Date(row.plannedDate) : new Date()
  });

  // Convert JS Date to ISO string before sending to API (when you add POST/PUT)
  private serializeSession = (s: SessionData): any => ({
    ...s,
    plannedDate: s.plannedDate instanceof Date ? s.plannedDate.toISOString() : s.plannedDate
  });

  private handleError(err: HttpErrorResponse) {
    console.error('SessionService error:', err);
    return throwError(() => err);
  }
}
