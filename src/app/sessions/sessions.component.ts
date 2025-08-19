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
  GridApi,
  GridOptions,
  ColumnApi,
  GridReadyEvent,
  ColDef,
  ICellEditorParams,  
  ColumnMenuTab
} from 'ag-grid-community';
import { ReportLoaderService } from 'src/services/report-loader.service';

export type ReportType = 'Vor-Protokol SKS' | 'Protokol SKS';

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
      sessionType: 'Vor-Protokol SKS',
      a1: 'Sitzung 1/2025',
      sessionDate: '2025-01-18',
      a6: 'Max1 Mustermann',
      a7: '2025-07-28',
      children: [
        { id: '31dc3e50-c6b0-46d7-9c56-b7754fdbbe0d', name: 'Bauvorhaben / Rosentalstrasse 121.1', isRoadworkProject: true },        
      ],
    },
    {
      id: 'f57d7f60-d49b-411f-a17b-7cd4911aae8e',
      sessionType: 'Vor-Protokol SKS',
      a1: 'Sitzung 2/2025',
      sessionDate: '2025-02-21',      
      a6: 'Max2 Mustermann',
      a7: '2025-07-29',
      children: [
        { id: '3a87b037-5b54-41b3-82d2-c75116eb3924', name: 'Bauvorhaben / Nägelseestrasse - SBB – Töss' , isRoadworkProject: true},        
      ],
    },
    {
      id: '46e3c862-1589-42bf-bcc5-f8d8e4bd93db',
      sessionType: 'Vor-Protokol SKS',
      a1: 'Sitzung 3/2025',
      sessionDate: '2025-07-21',      
      a6: 'Max2 Mustermann',
      a7: '2025-07-29',
      children: [        
        { id: 'f57d7f60-d49b-411f-a17b-7cd4911aae8e', name: 'Bauvorhaben / Flugplatzstrasse - Höhe Deltastrasse' , isRoadworkProject: true},        
      ],
    },
    {
      id: '81c7ee67-a0f9-448f-b425-0b0044f63cca',
      sessionType: 'Vor-Protokol SKS',
      a1: 'Sitzung 4/2025',
      sessionDate: '2025-08-01',      
      a6: 'Max2 Mustermann',
      a7: '2025-07-29',
      children: [        
        {  id: '46e3c862-1589-42bf-bcc5-f8d8e4bd93db', name: 'Bauvorhaben / Rosentalstrasse 121.1' , isRoadworkProject: true},        
      ],
    },
    {
      id: '85cba275-3067-447d-906b-24a8e4396770',
      sessionType: 'Vor-Protokol SKS',
      a1: 'Sitzung 5/2025',
      sessionDate: '2025-09-12',      
      a6: 'Max2 Mustermann',
      a7: '2025-07-29',
      children: [
        { id: '51f12323-4788-4ad9-bc9b-f971deab8208', name: 'Bauvorhaben / Theaterstrasse / Museumsstrasse' , isRoadworkProject: true},         
      ],
    },
  ];

  reportTypeOptions: ReportType[] = ['Vor-Protokol SKS', 'Protokol SKS'];   

  columnDefs: ColDef[] = [
    { headerName: 'Phase/Status', field: 'a1', minWidth: 220, cellRenderer: 'agGroupCellRenderer' },
    { headerName: 'Datum Genehmigung', field: 'sessionDate' },
    { headerName: 'Ersteller', field: 'a6' },
    { headerName: 'Datum', field: 'a7' },    
    {
      headerName: 'Berichtsstatus',
      field: 'sessionType',
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
        button.addEventListener('click', () => this.generateSessionPDF(params.data.id, params.data.sessionType, params.data.sessionDate, params.data.children));
        return button;
      },
    },
    {
      headerName: 'BV (quick only)',
      colId: 'bvQuick',
      hide: true,                 
      filter: false,              
      suppressColumnsToolPanel: true,
      valueGetter: p => {
        const d = p.data ?? {};      
        const childText = (d.children ?? [])
          .map((c:any) => c?.bv ?? c?.name ?? '') 
          .filter(Boolean)
          .join(' ');      
        return [
          d.sessionType,
          d.a1,
          d.sessionDate,
          d.a6,
          d.a7,
          childText,
        ].filter(Boolean).join(' ');
      },
      getQuickFilterText: p => String(p.value ?? ''),
    }
  ];

  isRowMaster = (dataItem: any) =>
    Array.isArray(dataItem?.children) && dataItem.children.length > 0;
  
  detailCellRendererParams = {
    detailGridOptions: {
      domLayout: 'normal',
      defaultColDef: { flex: 1, resizable: true },
      filter: 'agTextColumnFilter',
      menuTabs: ['filterMenuTab'], 
      columnDefs: [
            {
                headerName: '',
                colId: 'typeIcon',
                width: 60,
                pinned: 'left',
                suppressMenu: true,
                sortable: false,
                resizable: false,
                cellClass: 'type-icon-cell',
                cellRenderer: (p: any) => {
                  const e = document.createElement('span');                  
                  e.classList.add('material-icons', 'small-icon');                 
                  e.textContent = !p.data?.isRoadworkProject ? 'person' : 'work';
                  e.title = !p.data?.isRoadworkProject ? 'Person' : 'Bauvorhaben';
                  if (p.data?.isRoadworkProject) e.classList.add('icon-project');
                  return e;
                },
                tooltipValueGetter: (p:any) => (p.data?.type === 'person' ? 'Osoba' : 'Projekt'),
              },
              { headerName: 'Id', field: 'id' },
              { headerName: 'Name', field: 'name' },              
              { headerName: 'Werk', field: 'department' },              
              { headerName: 'E-Mail', field: 'mailAddress' },
              { headerName: 'Anwesend', 
                field: 'isPresent',
                cellRendererParams: {
                  disabled: false
                },
                cellRendererSelector: (params: any) => {
                  if (params.data.isRoadworkProject == true) {
                    return { component: undefined };
                  }
                  return {
                    component: 'agCheckboxCellRenderer',
                    params: { disabled: false }
                  };
                }, 
                cellEditorSelector: (params: any) => {
                  if (params.data.isRoadworkProject == true) {
                    return undefined;
                  }
                  return { component: 'agCheckboxCellEditor' };
                }
            },              
            { headerName: 'Verteiler', 
                field: 'isDistributionList',                
                cellRendererParams: {
                  disabled: false
                },
                cellRendererSelector: (params: any) => {
                  if (params.data.isRoadworkProject == true) {
                    return { component: undefined };
                  }
                  return {
                    component: 'agCheckboxCellRenderer',
                    params: { disabled: false }
                  };
                },
                cellEditorSelector: (params: any) => {
                  if (params.data.isRoadworkProject == true) {
                    return undefined;
                  }
                  return { component: 'agCheckboxCellEditor' };
                }
            }, 
      ],
      onFirstDataRendered: (e: any) => e.api.sizeColumnsToFit(),
    },
    getDetailRowData: (params: any) => {
      const rows = params.data?.children || [];            
      params.successCallback(rows);
    },
  };

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 200,    
    sortable: true,    
    resizable: true,        
    filter: 'agTextColumnFilter',
    menuTabs: ['filterMenuTab'],    
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

    this.userService.getAllUsers().subscribe(
      usersList => {
        usersList.forEach((user, index) => {        
          this.sessionsData.forEach(session => {
            session.children.push( {
              id: String(index + 1),
              name: user.firstName + " " + user.lastName,
              department: user.organisationalUnit.abbreviation,
              mailAddress:  user.mailAddress,
              isPresent: true,
              isDistributionList: Math.random() > 0.5 ? true: false    
            });
        })
      })
    })  
  }  

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.columnApi = params.columnApi;
  }

  onQuickFilterChanged() {
    const value = (document.querySelector<HTMLInputElement>('#input-quick-filter')?.value || '').trim();
    this.gridApi?.setQuickFilter(value);
  }

  async generateSessionPDF(id: string, sessionType: string, sessionDate: string, children: any[]): Promise<void> {    

    const html = await this.reportLoaderService.generateReport("report_roadwork_activity", sessionType, children, id);    
    
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
                    filename: 'Strategische Koordinationssitzung (SKS)' + '-' + sessionType + '.pdf',
                    margin: [10, 10, 16, 10],
                    html2canvas: {
                        scale: 2,
                        useCORS: true
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: {
                      mode: ['css', 'legacy'],
                      avoid: ['.no-split']
                    }
                })
                .toPdf()
                .get('pdf')
                .then((pdf: any) => {
                  const total = pdf.internal.getNumberOfPages();

                  for (let i = 1; i <= total; i++) {
                    pdf.setPage(i);
                    
                    const ps = pdf.internal.pageSize;
                    const w = ps.getWidth ? ps.getWidth() : ps.width;
                    const h = ps.getHeight ? ps.getHeight() : ps.height;

                    const text = `SKS-${sessionType}_${sessionDate}, Seite ${i} von ${total}`;
                    
                    const textWidth = pdf.getTextWidth(text);
                    const textHeight = 4;                     
                    const x = w - 10 - textWidth; 
                    const y = h - 8;      
                    pdf.setFillColor(255, 255, 0);        
                    pdf.rect(x, y - 3, textWidth, textHeight, 'F'); 

                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(9);
                    pdf.setTextColor(100);

                    
                    pdf.text(text, w - 10, h - 8, { align: 'right' });
                  }
                })
                .save();
    }    

}
