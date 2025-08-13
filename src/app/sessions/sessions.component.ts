/**
 * Author: Edgar Butwilowski
 * Copyright (c) Fachstelle Geoinformation Winterthur
 */
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User } from 'src/model/user';

import { AgGridAngular } from 'ag-grid-angular';
import { AG_GRID_LOCALE_DE } from 'src/helper/locale.de';
import 'ag-grid-enterprise';
import html2pdf from 'html2pdf.js';
import {
  ColGroupDef,
  GridApi,
  GridOptions,
  ColumnApi,
  GridReadyEvent,
  ColDef,
  ICellEditorParams
} from 'ag-grid-community';
import { ReportLoaderService } from 'src/services/report-loader.service';

export type ReportType = 'Berichtstyp' | 'Vor-Protokol SKS' | 'Protokol SKS';

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.css'],
})
export class SessionsComponent implements OnInit {
  isDataLoading = false;
  gridApi!: GridApi;
  columnApi!: ColumnApi;
  
  sessionsData: any[] = [
    {
      id: 'ae4194c3-8cef-4067-806d-aed3e7947ea1',
      meetingType: 'Berichtstyp',
      a1: 'Sitzung 1/2025',
      a2: '2025-01-18',
      a6: 'Max1 Mustermann',
      a7: '2025-07-28',
      childs: [
        { bv: 'Rosenbergstrasse 1' },
        { bv: 'Rosenbergstrasse 2' },
        { bv: 'Rosenbergstrasse 3' },
      ],
    },
    {
      id: 'f57d7f60-d49b-411f-a17b-7cd4911aae8e',
      meetingType: 'Berichtstyp',
      a1: 'Sitzung 2/2025',
      a2: '2025-02-21',      
      a6: 'Max2 Mustermann',
      a7: '2025-07-29',
      childs: [
        { bv: 'Rosenbergstrasse 21' },
        { bv: 'Rosenbergstrasse 22' },
      ],
    },
    {
      id: '46e3c862-1589-42bf-bcc5-f8d8e4bd93db',
      meetingType: 'Berichtstyp',
      a1: 'Sitzung 3/2025',
      a2: '2025-07-21',      
      a6: 'Max2 Mustermann',
      a7: '2025-07-29',
      childs: [
        { bv: 'Hauptstrasse 21' },
        { bv: 'Hauptstrasse 22' },
      ],
    },
    {
      id: '81c7ee67-a0f9-448f-b425-0b0044f63cca',
      meetingType: 'Berichtstyp',
      a1: 'Sitzung 4/2025',
      a2: '2025-08-01',      
      a6: 'Max2 Mustermann',
      a7: '2025-07-29',
      childs: [
        { bv: 'Bahnhofplatz 21' },
        { bv: 'Bahnhofplatz 22' },
      ],
    },
    {
      id: '85cba275-3067-447d-906b-24a8e4396770',
      meetingType: 'Berichtstyp',
      a1: 'Sitzung 5/2025',
      a2: '2025-09-12',      
      a6: 'Max2 Mustermann',
      a7: '2025-07-29',
      childs: [
        { bv: 'Pionierstrasse 7' },
        { bv: 'Pionierstrasse 8' },
      ],
    },
  ];

  reportTypeOptions: ReportType[] = ['Berichtstyp', 'Vor-Protokol SKS', 'Protokol SKS'];

  columnDefs: ColDef[] = [
    { headerName: 'Phase/Status', field: 'a1', minWidth: 220, cellRenderer: 'agGroupCellRenderer' },

    { headerName: 'Datum Genehmigung', field: 'a2' },
    { headerName: 'Ersteller', field: 'a6' },
    { headerName: 'Datum', field: 'a7' },    
    {
      headerName: 'Berichtsstatus',
      field: 'meetingType',
      editable: true,
      singleClickEdit: true,      
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: this.reportTypeOptions, // ReportType[] = string[]
      },
      filter: 'agSetColumnFilter',
      filterParams: { values: this.reportTypeOptions },      
      comparator: (a: ReportType, b: ReportType) =>
        this.reportTypeOptions.indexOf(a) - this.reportTypeOptions.indexOf(b),
      valueParser: p => {
        const v = (p.newValue ?? '').toString();
        return this.reportTypeOptions.includes(v as ReportType) ? v : null;
      },
      valueFormatter: p => p.value ?? '',
      minWidth: 200,    
      cellClass: 'report-combo-cell',  
    },
    {
      headerName: 'Bericht',
      cellRenderer: (params: any) => {
        const button = document.createElement('button');
        button.innerText = 'Bericht anzeigen';
        button.addEventListener('click', () => this.generateMeetingPDF(params.data.id));
        return button;
      },
    },

    {
      headerName: 'BV (quick only)',
      colId: 'bvQuick',
      valueGetter: p => (p.data?.childs || []).map((c: any) => c.bv).join(' '),
      hide: true,
      filter: false,
      suppressColumnsToolPanel: true,
    },
  ];

  isRowMaster = (dataItem: any) =>
    Array.isArray(dataItem?.childs) && dataItem.childs.length > 0;
  
  detailCellRendererParams = {
    detailGridOptions: {
      domLayout: 'autoHeight',
      defaultColDef: { flex: 1, resizable: true },
      columnDefs: [{ headerName: 'Bauvorhaben', field: 'bv' }],
      onFirstDataRendered: (e: any) => e.api.sizeColumnsToFit(),
    },
    getDetailRowData: (params: any) => {
      const rows = params.data?.childs || [];            
      params.successCallback(rows);
    },
  };

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 200,
    floatingFilter: true,
    sortable: true,
    filter: true,
    resizable: true,
  };
  
  user: User = new User();
  userService: UserService;  
  
  private roadWorkNeedService: RoadWorkNeedService; 
  private reportLoaderService: ReportLoaderService;
  private snckBar: MatSnackBar;    

  localeText = AG_GRID_LOCALE_DE;

  
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;
  @ViewChild('reportContainer', { static: false }) reportContainer!: ElementRef;

  constructor(
      roadWorkNeedService: RoadWorkNeedService, 
      reportLoaderService: ReportLoaderService,
      userService: UserService,
      snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.userService = userService;
    this.snckBar = snckBar;
    this.isDataLoading = true;        
    this.reportLoaderService = reportLoaderService;
  }

  ngOnInit(): void {  

    this.userService.getUserFromDB(this.userService.getLocalUser().mailAddress)
      .subscribe({
        next: (users) => {
          if (users && users.length > 0 && users[0]) {
            let user: User = users[0];
            ErrorMessageEvaluation._evaluateErrorMessage(user);
            if (user && user.errorMessage &&
              user.errorMessage.trim().length !== 0) {
              this.snckBar.open(user.errorMessage, "", {
                duration: 4000
              });
            } else {
              this.user = user;
            }
          }
          this.isDataLoading = false;
        },
        error: (error) => {
          this.snckBar.open("Beim Laden von Benutzerdaten ist ein Systemfehler aufgetreten. Bitte wenden Sie sich an den Administrator.", "", {
            duration: 4000
          });
          this.isDataLoading = false;
        }
      });
  
  }  

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.columnApi = params.columnApi;
  }

  onQuickFilterChanged() {
    const value = (document.querySelector<HTMLInputElement>('#input-quick-filter')?.value || '').trim();
    this.gridApi?.setQuickFilter(value);
  }

  async generateMeetingPDF(id: string): Promise<void> {    

    const html = await this.reportLoaderService.generateReport("report_roadwork_activity", id);    
    
    this.reportContainer.nativeElement.innerHTML = html;

    this.snckBar.open("PDF wird generiert..." + String(id), "", {
      duration: 4000
    });

    const target = this.reportContainer.nativeElement.firstElementChild as HTMLElement;

    if (!target || target.offsetWidth === 0 || target.offsetHeight === 0) {        
      return;
    }

    html2pdf().from(target)
                .set({
                    filename: 'Strategische Koordinationssitzung (SKS) -Vor-Protokoll.pdf',
                    margin: 10,
                    html2canvas: {
                        scale: 2,
                        useCORS: true
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                })
                .save();
    }    

}
