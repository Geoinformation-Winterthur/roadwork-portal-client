/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 *
 * SessionsComponent
 * -----------------
 * Displays SKS sessions in a master/detail AG Grid and generates reports.
 *
 * Key features:
 * - Aggregates `RoadWorkActivityFeature` items into dated "sessions".
 * - Enriches each session with attendees/distribution list users (from env-based email lists).
 * - Master grid shows session meta; detail grid lists projects and people.
 * - Generates a Word (.docx) and a PDF report for a selected session via `ReportLoaderService`,
 *   `html-docx-js-typescript`, and `html2pdf.js`.
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
import { environment } from 'src/environments/environment';

/** Master row model representing one SKS session. */
interface Session {
  id: string;
  sessionType: string;     // editable via select; see ReportType
  sessionName: string;     // e.g., "Sitzung 1/2025"
  sessionDateApproval: string;
  sessionCreator: string;  
  sessionDate: string;     
  children: { id: string; name: string; isRoadworkProject: boolean }[];
}

/** Detail row model representing either a project or a person in the session. */
interface SessionChild {
  id: string;
  name: string;
  isRoadworkProject: boolean;  
  department?: string;
  mailAddress?: string;
  isPresent?: boolean;
  shouldBePresent?: boolean;
  isDistributionList?: boolean;
  shouldBeOnDistributionList?: boolean;
}

/** Allowed report type values (also used by select editor/filter). */
export type ReportType = 'Vor-Protokol SKS' | 'Protokol SKS';

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.css'],
})
export class SessionsComponent implements OnInit {
  /** Controls loading spinners and disables editing while true. */
  isDataLoading = false;

  /** AG Grid API handles assigned in onGridReady. */
  gridApi!: GridApi;
  columnApi!: ColumnApi;
  
  /** Master grid data: list of sessions with expanded children in detail view. */
  sessionsData: Session[] = [];

  /**
   * Email hints from environment:
   * - `presentEmails`: if a user's email starts with any of these prefixes, they are marked present.
   * - `distributionListEmails`: analogous for the distribution list.
   */
  presentEmails: string[] = environment.presentEmails ?? [];
  distributionListEmails: string[] = environment.distributionListEmails ?? [];

  /** Values offered in the report type combo box. */
  reportTypeOptions: ReportType[] = ['Vor-Protokol SKS', 'Protokol SKS'];   

  /** Master grid columns; includes an action button to generate the report. */
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
        // Create a native button and attach click handler to generate reports.
        const button = document.createElement('button');
        button.innerText = 'Bericht anzeigen';        
        button.addEventListener('click', () => this.generateSessionPDF(params.data.id, params.data.sessionType, params.data.sessionDateApproval, params.data.children));
        return button;
      },
    },
    {
      /**
       * Hidden utility column to support quick filtering across multiple fields,
       * including flattened child data. It aggregates text into a single string,
       * which AG Grid uses when quick filter is applied.
       */
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

  /** Determines which rows are masters (those with non-empty `children`). */
  isRowMaster = (dataItem: any) =>
    Array.isArray(dataItem?.children) && dataItem.children.length > 0;
  
  /**
   * Configuration for the detail grid (rendered per master row).
   * Shows either a project (read-only icon) or a person (checkboxes for presence/distribution).
   */
  detailCellRendererParams = {
    detailGridOptions: {
      domLayout: 'normal',
      defaultColDef: { flex: 1, resizable: true, editable: () => !this.isDataLoading },
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
                  // Material icon identifying persons vs. projects.
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
                  // Projects: no checkbox; Persons: checkbox renderer/editor.
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
      // Provide the child rows to the detail grid.
      const rows = params.data?.children || [];            
      params.successCallback(rows);
    },
  };

  /** Default column settings for the master grid. */
  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 200,    
    sortable: true,    
    resizable: true,        
    filter: 'agTextColumnFilter',
    menuTabs: ['filterMenuTab'],    
  };
  
  /** Current user (loaded on init). */
  user: User = new User();
  userService: UserService;  
  
  /** Optional cache of activities (not directly bound in the grid). */
  roadWorkActivity: RoadWorkActivityFeature[] | undefined;
  
  /** Service references and feedback UI. */
  private roadWorkActivityService: RoadWorkActivityService; 
  private reportLoaderService: ReportLoaderService;
  private snckBar: MatSnackBar;    

  /** German locale overrides for AG Grid UI strings. */
  localeText = AG_GRID_LOCALE_DE;

  /** AG Grid and report container references from the template. */
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

  /**
   * Initialization sequence:
   * 1) Load the current user and surface any coded error via snack bar.
   * 2) Build session rows from activities, then enrich with selected users based on
   *    env-provided presence/distribution list email prefixes.
   */
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

    // Precompute sets for case-insensitive prefix checks on user emails.
    const presentSet = new Set(
      this.presentEmails.map((e: string) => e.toLowerCase().trim())
    );
    const distributionListSet = new Set(
      this.distributionListEmails.map((e: string) => e.toLowerCase().trim())
    );

    // Pipe: activities → sessions → attach selected users to each session as children.
    const sessionsWithUsers$ = this.roadWorkActivityService.getRoadWorkActivities().pipe(
      map((activities: RoadWorkActivityFeature[]) => this.transformToSessions(activities)),
      switchMap((sessions: Session[]) =>
        this.userService.getAllUsers().pipe(
          map(users => {            
            // Map users into SessionChild rows and mark presence/distribution flags by prefix rules.
            const mapped: SessionChild[] = users.map((user) => {              
              const email = (user.mailAddress ?? '').toLowerCase().trim();
              
              const isPresent = email !== '' && [...presentSet].some(p => email.startsWith(p));
              const isDistributionList = email !== '' && [...distributionListSet].some(p => email.startsWith(p));

              return {                
                id: '', 
                name: `${user.firstName} ${user.lastName}`,
                isRoadworkProject: false,
                department: user.organisationalUnit?.abbreviation ?? '',
                mailAddress: user.mailAddress ?? '',
                isPresent,
                shouldBePresent: isPresent,
                isDistributionList,
                shouldBeOnDistributionList: isDistributionList
              };
            });
            
            // Keep only those users who should be listed (present or on distribution list).
            const filtered = mapped.filter(u => u.shouldBePresent || u.shouldBeOnDistributionList);
            
            // Assign incremental IDs for UI display.
            const userChildren: SessionChild[] = filtered.map((u, idx) => ({
              ...u,
              id: String(idx + 1),
            }));
            
            // Combine existing session children (projects) with user children.
            return sessions.map(session => ({
              ...session,
              children: [...session.children, ...userChildren],
            }));
          })
        )
      )
    );

    // Bind the final result to the grid.
    sessionsWithUsers$.subscribe({
      next: (sessions) => {
        this.sessionsData = sessions;
      },
      error: console.error
    });

  }

  /** AG Grid callback: capture APIs for later operations. */
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.columnApi = params.columnApi;
  }

  /** Apply quick filter text from an input element to the grid. */
  onQuickFilterChanged() {
    const value = (document.querySelector<HTMLInputElement>('#input-quick-filter')?.value || '').trim();
    this.gridApi?.setQuickFilter(value);
  }

  /**
   * Generate a Word document and a PDF for the provided session.
   * Steps:
   * - Retrieve HTML from `ReportLoaderService`.
   * - Render to a hidden container to ensure size/layout is known.
   * - Save as .docx via `asBlob` and as .pdf via `html2pdf`.
   * - Add a footer to each PDF page containing session meta and page X/Y.
   *
   * @param id Session id (typically a UUID from the primary activity).
   * @param sessionType One of `ReportType`.
   * @param sessionDateApproval ISO date string used in the footer.
   * @param children Detail rows (projects + people) used by the report template.
   */
  async generateSessionPDF(id: string, sessionType: string, sessionDateApproval: string, children: any[]): Promise<void> {        

    this.isDataLoading = true;       

    try {
      const html = await this.reportLoaderService.generateReport("report_roadwork_activity", sessionType, children, id);    
      
      // Inject generated HTML into the hidden container for export.
      this.reportContainer.nativeElement.innerHTML = html;

      const target = this.reportContainer.nativeElement.firstElementChild as HTMLElement;

      if (!target || target.offsetWidth === 0 || target.offsetHeight === 0) {        
        return;
      }

      // START: Save as Word (docx)
      this.snckBar.open("Word-Dokument wird generiert..." + String(sessionType) + " - " + String(sessionDateApproval), "", {
        duration: 4000
      });
      const filenameBase = `Strategische Koordinationssitzung (SKS) - ${sessionType}`;
      
      // Helper to convert centimeters to twips (1/20 pt).
      const cmToTwips = (cm: number) => Math.round((1440 / 2.54) * cm);
      
      const margins = {
        top: cmToTwips(2),
        right: cmToTwips(1),
        bottom: cmToTwips(2),
        left: cmToTwips(2),
      };

      // Wrap the content in a minimal HTML scaffold for HTML→DOCX conversion.
      const htmlWord = `<!doctype html><html><head><meta charset="utf-8">
        <style>        
          @page { margin: 1cm; size: A4; }
          body { font-family: Arial, sans-serif; }
          .page-break { page-break-before: always; }
          img { max-width: 100%; height: auto; }
        </style>
      </head><body><div style="margin:0">${target.outerHTML}</div></body></html>`;

      const blobOrBuffer = await asBlob(htmlWord, {
        orientation: 'portrait' as const,
        margins, // 1 cm = ~567 twips
      });

      const docxMime =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const docxBlob =
        blobOrBuffer instanceof Blob
          ? blobOrBuffer
          : new Blob([blobOrBuffer as unknown as ArrayBuffer], { type: docxMime });

      saveAs(docxBlob, `${filenameBase}.docx`);      
      // END: Save as Word

      // START: Save as PDF (html2pdf)
      this.snckBar.open("PDF wird generiert..." + String(sessionType) + " - " + String(sessionDateApproval), "", {          
        duration: 4000
      });
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
                    // Footer injection loop for each page.
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
                      pdf.setFillColor(255, 255, 255);        
                      pdf.rect(x, y - 3, textWidth, textHeight, 'F'); 

                      pdf.setFont('helvetica', 'normal');
                      pdf.setFontSize(9);
                      pdf.setTextColor(100);

                      // Right-aligned footer text, slightly above page bottom.
                      pdf.text(text, w - 10, h - 8, { align: 'right' });
                    }
                  })
                  .save();     
                  // END: Save as PDF
        } catch (error) {          
          this.snckBar.open("Fehler beim Generieren des Berichts.", "", {
            duration: 4000
          });
        } finally {
          this.isDataLoading = false;    
        }
    }    

    /**
     * Transform a flat list of activities into grouped sessions.
     * Group key is `dateSksPlanned` (ISO string), with "unknown" used as fallback.
     * Sessions are named "Sitzung N/YYYY" with a per-year counter.
     *
     * @param activities Raw activities from the service.
     * @returns Array of sessions ready for the grid.
     */
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
        let sessionName = "Sitzung ?/unbekannt";
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
            name: `${act.properties.type} / ${act.properties.section || act.properties.name}`,
            isRoadworkProject: true
          }))
        });
      }

      return sessions;
    }

}
