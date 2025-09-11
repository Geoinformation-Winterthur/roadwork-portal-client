/**
 * Author: Edgar Butwilowski
 * Copyright (c) Fachstelle Geoinformation Winterthur
 */
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { UserService } from 'src/services/user.service';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User } from 'src/model/user';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
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
import { map } from 'rxjs/internal/operators/map';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import saveAs from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';

interface Session {
  id: string;
  sessionType: string;     
  sessionName: string;     
  sessionDateApproval: string;
  sessionCreator: string;  
  sessionDate: string;     
  children: { id: string; name: string; isRoadworkProject: boolean }[];
}

interface SessionChild {
  id: string;
  name: string;
  isRoadworkProject: boolean;  
  department?: string;
  mailAddress?: string;
  isPresent?: boolean;
  isDistributionList?: boolean;
}

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
  
  sessionsData: Session[] = [];

  reportTypeOptions: ReportType[] = ['Vor-Protokol SKS', 'Protokol SKS'];   

  columnDefs: ColDef[] = [
    { headerName: 'Phase/Status', field: 'sessionName', minWidth: 220, cellRenderer: 'agGroupCellRenderer' },
    { headerName: 'Datum Genehmigung', field: 'sessionDateApproval' },
    /* { headerName: 'Ersteller', field: 'sessionCreator' },
    { headerName: 'Datum', field: 'sessionDate' },     */
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
        button.addEventListener('click', () => this.generateSessionPDF(params.data.id, params.data.sessionType, params.data.sessionDateApproval, params.data.children));
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
          d.sessionName,
          d.sessionDateApproval,
          d.sessionCreator,
          d.sessionDate,
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
  
  roadWorkActivity: RoadWorkActivityFeature[] | undefined;
  
  private roadWorkActivityService: RoadWorkActivityService; 
  private reportLoaderService: ReportLoaderService;
  private snckBar: MatSnackBar;    

  localeText = AG_GRID_LOCALE_DE;

  
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;
  @ViewChild('reportContainer', { static: false }) reportContainer!: ElementRef;

  constructor(
      roadWorkActivityService: RoadWorkActivityService, 
      reportLoaderService: ReportLoaderService,
      userService: UserService,
      snckBar: MatSnackBar) {
    this.roadWorkActivityService = roadWorkActivityService;
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

    const sessionsWithUsers$ = this.roadWorkActivityService.getRoadWorkActivities().pipe(
      map((activities: RoadWorkActivityFeature[]) => this.transformToSessions(activities)), 
      switchMap((sessions: Session[]) =>
        this.userService.getAllUsers().pipe(
          map(users => {            
            const userChildren: SessionChild[] = users.map((user, index) => ({
              id: String(index + 1),
              name: `${user.firstName} ${user.lastName}`,
              isRoadworkProject: false, 
              department: user.organisationalUnit?.abbreviation ?? "",
              mailAddress: user.mailAddress ?? "",
              isPresent: true,
              isDistributionList: true
            }));
            
            return sessions.map(session => ({
              ...session,
              children: [...session.children, ...userChildren]
            }));
          })
        )
      )
    );

    sessionsWithUsers$.subscribe({
      next: (sessions) => {
        this.sessionsData = sessions;
      },
      error: console.error
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

  async generateSessionPDF(id: string, sessionType: string, sessionDateApproval: string, children: any[]): Promise<void> {    

    const html = await this.reportLoaderService.generateReport("report_roadwork_activity", sessionType, children, id);    
    
    this.reportContainer.nativeElement.innerHTML = html;

    this.snckBar.open("PDF wird generiert..." + String(sessionType) + " - " + String(sessionDateApproval), "", {
      duration: 4000
    });

    const target = this.reportContainer.nativeElement.firstElementChild as HTMLElement;

    if (!target || target.offsetWidth === 0 || target.offsetHeight === 0) {        
      return;
    }

    // START: Save as Word
    const filenameBase = `Strategische Koordinationssitzung (SKS) - ${sessionType}`;
                    
    const htmlWord = `<!doctype html><html><head><meta charset="utf-8">
          <style>body{font-family: Arial, sans-serif}.page-break{page-break-before:always}</style>
          </head><body>${target.outerHTML}</body></html>`;
    
    const blob = await asBlob(htmlWord);   // returns a Blob
    saveAs(blob as Blob, `${filenameBase}.docx`);
    // END: Save as Word

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

                    const text = `SKS-${sessionType}_${sessionDateApproval}, Seite ${i} von ${total}`;
                    
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

    transformToSessions(activities: RoadWorkActivityFeature[]): Session[] {
      // Group activities by ISO date of dateSksPlanned 
      const groups = new Map<string, RoadWorkActivityFeature[]>();

      for (const act of activities) {
        const dateKey = act.properties.dateSksPlanned ?.toString() ?? "unknown";
        if (!groups.has(dateKey)) groups.set(dateKey, []);
        groups.get(dateKey)!.push(act);
      }

      // Sort date keys (exclude "unknown" for sorting; append at the end)
      const knownDateKeys = [...groups.keys()].filter(k => k !== "unknown").sort(); // ascending YYYY-MM-DD
      const dateKeys = [...knownDateKeys, ...(groups.has("unknown") ? ["unknown"] : [])];

      // Per-year counters
      const yearCount = new Map<string, number>();

      const sessions: Session[] = [];

      for (const dateKey of dateKeys) {
        const acts = groups.get(dateKey)!;
        const first = acts[0];

        // sessionName: "Sitzung N/YYYY" where N resets per year
        let sessionName = "Sitzung ?/unknown";
        if (dateKey !== "unknown") {
          const year = dateKey.slice(0, 4);
          const n = (yearCount.get(year) ?? 0) + 1;
          yearCount.set(year, n);
          sessionName = `Sitzung ${n}/${year}`;
        }

        sessions.push({
          id: first.properties.uuid,
          sessionType: "Vor-Protokol SKS",
          sessionName,
          sessionDateApproval: dateKey.split("T")[0], // YYYY-MM-DD
          sessionCreator: first.properties.areaManager?.firstName ?? "",
          sessionDate: first.properties.created.toString() ?? "",
          children: acts.map(act => ({
            id: act.properties.uuid,
            name: `Bauvorhaben:${act.properties.type} / ${act.properties.section || act.properties.name}`,
            isRoadworkProject: true
          }))
        });
      }

      return sessions;
    }

}
