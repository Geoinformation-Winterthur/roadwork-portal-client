import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ExplorerActivity {
  uuid: string;
  bv_nr: string;
  name: string;
  status: string;
  excel_row: number | null;
  reference_count: number;
  matched_reference_count: number;
  provis_project_count: number;
  need_count: number;
  costs_total: number;
  quality: string;
}

export interface ExplorerDetail {
  activity: any;
  provis: any[];
  needs: any[];
  costs: any[];
  journal: any[];
  excel: any[];
  pdb: any[];
}

@Injectable({ providedIn: 'root' })
export class ProvisExplorerService {
  private readonly url = environment.apiUrl.replace(/\/$/, '') + '/api/provis-explorer';
  constructor(private http: HttpClient) {}
  activities(): Observable<ExplorerActivity[]> {
    return this.http.get<ExplorerActivity[]>(this.url + '/activities');
  }
  detail(uuid: string): Observable<ExplorerDetail> {
    return this.http.get<ExplorerDetail>(this.url + '/activities/' + encodeURIComponent(uuid));
  }
}
