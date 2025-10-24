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
import { MatSnackBar } from '@angular/material/snack-bar';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  ColumnApi,
  GridApi,
  GridReadyEvent,
  FirstDataRenderedEvent,
  IRowNode
} from 'ag-grid-community';

import { UserService } from 'src/services/user.service';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { User } from 'src/model/user';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { ReportLoaderService } from 'src/services/report-loader.service';
import { map } from 'rxjs/internal/operators/map';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import saveAs from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';
import html2pdf from 'html2pdf.js';
import { environment } from 'src/environments/environment';
import { AG_GRID_LOCALE_DE } from 'src/helper/locale.de';
import { SessionService } from 'src/services/session.service';
import { FormBuilder, Validators } from '@angular/forms';
import { debounceTime, filter } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';


/** Top-level row model representing one session. */
interface Session {
  id: string;
  sessionType: string;
  sessionName: string;
  sessionDateApproval: string;
  sessionCreator: string;
  sessionDate: string;
  attachments : string;
  acceptance1 : string;
  miscItems : string;
  plannedDate?: Date;
  sksNo?: number;
  errorMessage?: string;

  /** Legacy combined list (projects + people) – still used for report generation. */
  children: SessionChild[];

  /** Independent lists built once and kept on the session object. */
  childrenProjects: SessionChild[];        // only isRoadworkProject === true
  childrenPresent: SessionChild[];         // only people with isPresent === true
  childrenDistribution: SessionChild[];    // only people with isDistributionList === true
}
/** Child row model representing either a project (isRoadworkProject === true) or a person. */
interface SessionChild {
  id: string;
  name: string;
  isRoadworkProject: boolean;

  // fields mainly used by people rows
  department?: string;
  mailAddress?: string;
  isPresent?: boolean;
  shouldBePresent?: boolean;
  isDistributionList?: boolean;  
}

/** Allowed report types. */
type ReportType = 'Vor-Protokol SKS' | 'Protokol SKS';

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.css'],
})
export class SessionsComponent implements OnInit {
  /** Busy flag toggling spinners/UX blocking. */
  isDataLoading = false;

  /** APIs for the sessions (master) grid. */
  sessionsApi!: GridApi;
  sessionsColumnApi!: ColumnApi;

  /** Data for the sessions (master) grid. */
  sessionsData: any[] = [];
  /** Actually selected session */
  selectedSession: Session | null = null;

  /** Derived child lists for the selected session. */
  projectRows: SessionChild[] = [];
  presentUserRows: SessionChild[] = [];
  distributionUserRows: SessionChild[] = [];
  peopleDirty = false;

  /** Cached user and injected services. */
  //user: User = new User();
  userService: UserService;
  sessionService: SessionService;

  private roadWorkActivityService: RoadWorkActivityService;
  private reportLoaderService: ReportLoaderService;
  private snckBar: MatSnackBar;

  
  /** Locale for AG Grid UI strings. */
  localeText = AG_GRID_LOCALE_DE;

  /** Values for the report type combo. */
  reportTypeOptions: ReportType[] = ['Vor-Protokol SKS', 'Protokol SKS'];

  /** Reference to the hidden report container. */
  @ViewChild('reportContainer', { static: false }) reportContainer!: ElementRef;

  /** Optional references to child grids (used only for convenience). */
  @ViewChild('projectGrid') projectGrid?: AgGridAngular;
  @ViewChild('presentGrid') presentGrid?: AgGridAngular;
  @ViewChild('distributionGrid') distributionGrid?: AgGridAngular;
  @ViewChild('sessionsGrid') sessionsGrid!: AgGridAngular;

  constructor(
    roadWorkActivityService: RoadWorkActivityService,
    reportLoaderService: ReportLoaderService,
    userService: UserService,
    sessionService: SessionService,
    snckBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.sessionService = sessionService;
    this.reportLoaderService = reportLoaderService;
    this.snckBar = snckBar;
    this.isDataLoading = true;

    // Push edits from the form back into the selected row (debounced)
    this.detailsForm.valueChanges
      .pipe(
        debounceTime(200),
        filter(() => !!this.selectedNode && this.detailsForm.enabled)
      )
      .subscribe(values => {
        if (!this.selectedNode) return;
        // Update row data
        Object.assign(this.selectedNode.data, {
          acceptance1: values.acceptance1 ?? '',
          attachments: values.attachments ?? '',
          miscItems: values.miscItems ?? '',
        });
        // Refresh just the three columns for this row
        this.sessionsGrid.api.refreshCells({
          rowNodes: [this.selectedNode],
          columns: ['acceptance1', 'attachments', 'miscItems'],
          force: true,
        });
      });
  }


  detailsForm = this.fb.group({
    acceptance1: ['', [Validators.maxLength(1000)]],
    attachments: ['', [Validators.maxLength(1000)]],
    miscItems: ['', [Validators.maxLength(1000)]],
  });

  selectedNode: IRowNode | null = null;

  /** Slightly simplified defaults for child grids. */
  childDefaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: 'agTextColumnFilter',
    menuTabs: ['filterMenuTab'],    
    minWidth: 30,
  };

  /** Columns for the projects grid. */
  projectsColDefs: ColDef[] = [
    { headerName: 'Id', field: 'id', suppressSizeToFit: true, width: 310, tooltipField: 'id' },
    { headerName: 'Bauvorhaben', field: 'name', flex: 1 },
  ];

  /** Columns for the people grids - present users */
  peopleColDefs: ColDef[] = [    
    {
      headerName: '',
      field: 'isPresent',
      minWidth: 50,
      editable: true,
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',
      valueSetter: params => {        
        const v = params.newValue === true || params.newValue === 'true';
        params.data.isPresent = v;        
        return true;
      },      
    },  
    { headerName: 'Name', field: 'name', minWidth: 150 },
    { headerName: 'Werk', field: 'department', minWidth: 60 },
    { headerName: 'E-Mail', field: 'mailAddress', minWidth: 160,  flex: 1  }
  ];


  /** Columns for the people grids - present users */
  distributionColDefs: ColDef[] = [    
    {
      headerName: '',
      field: 'isDistributionList',
      minWidth: 50,
      editable: true,
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',
      valueSetter: params => {
        const v = params.newValue === true || params.newValue === 'true';
        params.data.isDistributionList = v;        
        return true;
      }
    },
    { headerName: 'Name', field: 'name', minWidth: 150 },
    { headerName: 'Werk', field: 'department', minWidth: 60 },
    { headerName: 'E-Mail', field: 'mailAddress', minWidth: 160, flex: 1 }
  ];

dtf = new Intl.DateTimeFormat('de-CH', { year: 'numeric', month: '2-digit', day: '2-digit' });

fmtDate = (d: any) => d ? new Date(d).toISOString().slice(0, 10) : '';

defaultColDef: ColDef = {
  sortable: true,
  resizable: true,
  filter: true,               
  menuTabs: ['filterMenuTab'], 
  minWidth: 100  
};

sessionsColDefs: ColDef[] = [
    {
      headerName: 'ID',
      field: 'id',
      hide: true,
      width: 90,
      suppressSizeToFit: true,
      filter: 'agNumberColumnFilter',
      type: 'numericColumn',
    },
    {
      headerName: 'SKS No',
      field: 'sksNo',
      width: 110,
      suppressSizeToFit: true,
      filter: 'agNumberColumnFilter',
    },
    { headerName: 'Sitzung', field: 'sessionName', minWidth: 220 },
    { headerName: 'Datum Genehmigung', field: 'plannedDate', minWidth: 160 },
    {
      headerName: 'Berichtsstatus',
      field: 'sessionType',
      editable: true,
      singleClickEdit: true,
      cellEditor: 'agSelectCellEditor',               // community editor
      cellEditorParams: { values: this.reportTypeOptions },
      valueParser: p => {
        const v = String(p.newValue ?? '');
        return this.reportTypeOptions.includes(v as ReportType) ? v : p.oldValue;
      },
      minWidth: 180,
      cellClass: 'report-combo-cell',
      flex: 1
    },     
    {
      headerName: '1. Abnahme SKS-Protokoll',
      field: 'acceptance1',
      minWidth: 200,
      tooltipField: 'acceptance1',
      flex: 1
    },
    {
      headerName: 'Beilagen',
      field: 'attachments',
      minWidth: 160,
      tooltipField: 'attachments',
    },
    {
      headerName: 'Verschiedenes',
      field: 'miscItems',
      minWidth: 180,
      tooltipField: 'miscItems',
    },
    {
      headerName: 'Teilnehmerliste',
      field: 'presentUserIds',
      minWidth: 180,
      tooltipField: 'presentUserIds',
    },
    {
      headerName: 'E-Mail-Verteiler',
      field: 'distributionUserIds',
      minWidth: 180,
      tooltipField: 'distributionUserIds',
    },
    {
      headerName: 'Fehlernachricht',
      field: 'errorMessage',
      minWidth: 180,
      tooltipField: 'errorMessage'
    },
    {
      headerName: 'Bericht',
      minWidth: 160,
      cellRenderer: (params: any) => {
        const btn = document.createElement('button');
        btn.textContent = 'Bericht anzeigen';

        // Disable button if the row has no valid id
        if (!params.data?.id) {
          btn.disabled = true;
          btn.style.opacity = '0.5';           // Optional: visual cue
          btn.style.cursor = 'not-allowed';    // Optional: show disabled cursor
        } else {
          btn.addEventListener('click', () => {                  
            this.generateSessionPDF(
              params.data.sessionType,
              params.data.sessionDateApproval,
              params.data.children
            );
          });
        }

        return btn;
      },
      filter: false,
      sortable: false,
    },    
    {
      // Hidden helper column feeding the quick filter with project names too.
      headerName: 'Search helper',
      colId: 'q',
      hide: true,
      valueGetter: p => {
        const d = p.data ?? {};
        // Prefer new split lists; fall back to legacy `children`
        const projects: any[] =
          (d.childrenProjects ??
            (Array.isArray(d.children)
              ? d.children.filter((c: any) => c?.isRoadworkProject === true)
              : [])) || [];

        const projectNames = projects
          .map((c: any) => c?.name ?? '')
          .filter(Boolean)
          .join(' ');

        return [
          d.sessionType,
          d.sessionName,
          d.sessionDateApproval,
          d.sessionCreator,
          d.sessionDate,
          projectNames, // <- include project names in quick filter text
        ]
          .filter(Boolean)
          .join(' ');
      },
    },
  ];
  
  ngOnInit(): void {
    this.isDataLoading = true;

    // Helper: normalize any Date/string to YYYY-MM-DD for joining
    const toIsoDateOnly = (d?: Date | string | null): string => {
      if (!d) return '';
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      return new Date(d).toISOString().slice(0, 10);
    };

    this.sessionService.getAll().pipe(
      // Step 1: Build base sessions into this.sessionsData
      map((rows) => {
        const toIsoDate = (d?: Date) => (d instanceof Date ? d.toISOString().slice(0, 10) : '');
        this.sessionsData = rows.map((row, idx) => ({
          id: idx + 1,
          sessionType: 'Vor-Protokol SKS',
          sessionName: 'Sitzung ' + (row.plannedDate?.getMonth() +1) + '-' + row.plannedDate?.getFullYear(),
          sessionDateApproval: toIsoDate(row.plannedDate),
          sessionDate: row.plannedDate?.toString() ?? '',
          plannedDate: row.plannedDate,
          sksNo: row.sksNo,
          sessionCreator: row.sessionCreator ?? '',
          acceptance1: row.acceptance1 || '-',
          attachments: row.attachments || '-',
          miscItems: row.miscItems || '-',
          errorMessage: row.errorMessage || '',
          presentUserIds: row.presentUserIds || '',
          distributionUserIds: row.distributionUserIds || '',
          // Will be filled below
          childrenPresent: [],
          childrenDistribution: [],
          childrenProjects: [],
          children: []
        }));
        return this.sessionsData;
      }),

      // Step 2: Fetch activities and users, then enrich sessions
      switchMap((sessions) => {
        // Short-circuit if there are no sessions
        if (!sessions || sessions.length === 0) return of([]);

        return forkJoin({
          activities: this.roadWorkActivityService.getRoadWorkActivities(),
          users: this.userService.getAllUsers()
        }).pipe(
          map(({ activities, users }) => {
            // Group activities by dateSksPlanned (YYYY-MM-DD)
            const actsByDate = new Map<string, RoadWorkActivityFeature[]>();
            for (const a of activities ?? []) {
              const key = toIsoDateOnly(a?.properties?.dateSksPlanned);
              if (!actsByDate.has(key)) actsByDate.set(key, []);
              actsByDate.get(key)!.push(a);
            }

            // Build user-derived lists once
            const people = (users ?? []).map((user, idx) => {
              const isPresent = user.isParticipantList === true;
              const isDistributionList = user.isDistributionList === true;
              return {
                id: String(idx + 1),
                name: `${user.firstName} ${user.lastName}`,
                isRoadworkProject: false,
                department: user.organisationalUnit?.abbreviation ?? '',
                mailAddress: user.mailAddress ?? '',
                isPresent,
                shouldBePresent: isPresent,
                isDistributionList,
              } as SessionChild;
            });

            const childrenPresent = people.filter(p => p.isPresent);
            const childrenDistribution = people.filter(p => p.isDistributionList);

            // Track matched activity UUIDs to later build the "Unbekannt" session
            const matchedActivityIds = new Set<string>();

            // Enrich each real session with projects and users
            const enriched = sessions.map(s => {
              const key = toIsoDateOnly(s.plannedDate);
              const acts = actsByDate.get(key) ?? [];

              // Mark matched activities
              for (const act of acts) {
                const uuid = act?.properties?.uuid;
                if (uuid) matchedActivityIds.add(uuid);
              }

              // Projects linked by date
              const childrenProjects: SessionChild[] = acts.map(act => ({
                id: act.properties.uuid,
                name: `${act.properties.type} / ${act.properties.section || act.properties.name}`,
                isRoadworkProject: true,
              }));

              // Merge unique users (Present + Distribution)
              const uniq = new Map<string, SessionChild>();
              for (const p of [...childrenPresent, ...childrenDistribution]) {
                const k = (p.mailAddress || p.id).toLowerCase();
                if (!uniq.has(k)) uniq.set(k, p);
              }
              const allPeople = Array.from(uniq.values());
              const children = [...childrenProjects, ...allPeople];

              return {
                ...s,
                childrenProjects,
                childrenPresent,
                childrenDistribution,
                children,
              };
            });

            // Build dummy "Unbekannt" session for activities that were not matched by date
            const unmatchedActs = (activities ?? []).filter(
              a => a?.properties?.uuid && !matchedActivityIds.has(a.properties.uuid)
            );

            if (unmatchedActs.length > 0) {
              const unknownProjects: SessionChild[] = unmatchedActs.map(act => ({
                id: act.properties.uuid,
                name: `${act.properties.type} / ${act.properties.section || act.properties.name}`,
                isRoadworkProject: true,
              }));

              // Reuse the same people lists for the dummy session
              const uniq = new Map<string, SessionChild>();
              for (const p of [...childrenPresent, ...childrenDistribution]) {
                const k = (p.mailAddress || p.id).toLowerCase();
                if (!uniq.has(k)) uniq.set(k, p);
              }
              const allPeople = Array.from(uniq.values());

              const unknownSession: Session = {
                id: null as any,
                sessionType: '-',
                sessionName: 'Sitzung Unbekannt',  
                sessionDateApproval: '',
                sessionDate: '',
                plannedDate: null as any,    
                sksNo: undefined as any,
                sessionCreator: '',
                acceptance1: '-',
                attachments: '-',
                miscItems: '-',
                errorMessage: '',
                childrenProjects: unknownProjects,
                childrenPresent,
                childrenDistribution,
                children: [...unknownProjects, ...allPeople],
              };

              enriched.push(unknownSession);
            }

            // Optional: keep "Unbekannt" at the end; otherwise keep current order
            const sorted = enriched.sort((a, b) => {
              if (a.id === 'unbekannt') return 1;
              if (b.id === 'unbekannt') return -1;
              // If both have plannedDate, sort by date ascending; otherwise preserve order
              const ad = a.plannedDate ? new Date(a.plannedDate as any).getTime() : NaN;
              const bd = b.plannedDate ? new Date(b.plannedDate as any).getTime() : NaN;
              if (isNaN(ad) || isNaN(bd)) return 0;
              return bd - ad;
            });

            return sorted;
          })
        );
      })
    ).subscribe({
      next: (enrichedSessions) => {
        // Store enriched sessions directly in sessionsData
        this.sessionsData = enrichedSessions ?? [];

        // Auto-select the first row in the sessions grid
        setTimeout(() => {
          if (this.sessionsApi && this.sessionsData.length > 0) {
            this.sessionsApi.ensureIndexVisible(0);
            const first = this.sessionsApi.getDisplayedRowAtIndex(0);
            first?.setSelected(true);
          } else if (this.sessionsGrid?.api && this.sessionsData.length > 0) {
            const first = this.sessionsGrid.api.getDisplayedRowAtIndex(0);
            first?.setSelected(true);
          }
        }, 0);

        this.isDataLoading = false;
      },
      error: (err) => {
        console.error('Error loading sessions, activities, or users:', err);
        // User-facing message stays in German
        this.snckBar.open(
          'Beim Laden der *Sitzungen* ist ein Systemfehler aufgetreten. Bitte wenden Sie sich an den Administrator.',
          '',
          { duration: 4000 }
        );
        this.isDataLoading = false;
      }
    });
  }



  /** AG Grid callback for the sessions grid. */
  onSessionsGridReady(e: GridReadyEvent) {
    this.sessionsApi = e.api;
    this.sessionsColumnApi = e.columnApi;
  }

  /** Handle selection change on the sessions grid and push prebuilt lists into child grids. */
  onSessionSelectionChanged(): void {
    this.peopleDirty = false;
    // Get the currently selected node from the sessions grid
    const nodes = this.sessionsGrid?.api?.getSelectedNodes?.() ?? [];
    this.selectedNode = nodes[0] ?? null;

    // If nothing is selected: clear child grids and disable/clear details form
    if (!this.selectedNode) {
      this.projectRows = [];
      this.presentUserRows = [];
      this.distributionUserRows = [];

      this.detailsForm.reset({ acceptance1: '', attachments: '', miscItems: '' });
      this.detailsForm.disable({ emitEvent: false });
      return;
    }

    // Extract selected session data
    const session: Session = this.selectedNode.data;

    // Enable and patch the details form with values from the selected session
    this.detailsForm.enable({ emitEvent: false });
    this.detailsForm.patchValue(
      {
        acceptance1: session?.acceptance1 ?? '',
        attachments: session?.attachments ?? '',
        miscItems: session?.miscItems ?? '',
      },
      { emitEvent: false }
    );

    // Push prebuilt independent lists into the three child grids
    this.projectRows = session?.childrenProjects ?? [];
    this.presentUserRows = session?.childrenPresent ?? [];
    this.distributionUserRows = session?.childrenDistribution ?? [];

    
    setTimeout(() => {
      this.projectGrid?.api?.refreshCells?.({ force: true });
      this.presentGrid?.api?.refreshCells?.({ force: true });
      this.distributionGrid?.api?.refreshCells?.({ force: true });
      
    }, 0);
  }
  /** Apply the top quick filter to the sessions grid. */
  onQuickFilterChanged() {
    const value =
      (document.querySelector<HTMLInputElement>('#input-quick-filter')?.value || '').trim();
    this.sessionsApi?.setQuickFilter(value);
  }

  /** Convenience helper: auto-size all columns in a just-rendered child grid. */
  autoSizeAll(e: FirstDataRenderedEvent) {
    // For large tables, consider sizeColumnsToFit instead.
    const all = e.columnApi.getAllColumns() || [];
    e.columnApi.autoSizeColumns(all);
  }

  /**
   * Report generation (DOCX + PDF):
   * - Render server-provided HTML into hidden container
   * - Save as .docx (html-docx-js-typescript)
   * - Save as .pdf (html2pdf) with a footer on each page
   */
  async generateSessionPDF(    
    sessionType: string,
    sessionDateApproval: string,
    children: any[]
  ): Promise<void> {
    this.isDataLoading = true;

    try {
      const html = await this.reportLoaderService.generateReport(
        'report_roadwork_activity',
        sessionType,
        children,        
      );

      // Inject HTML into hidden container.
      this.reportContainer.nativeElement.innerHTML = html;

      const target = this.reportContainer.nativeElement.firstElementChild as HTMLElement;
      if (!target || target.offsetWidth === 0 || target.offsetHeight === 0) return;

      // --- DOCX ---
      this.snckBar.open(
        'Word-Dokument wird generiert… ' + String(sessionType) + ' - ' + String(sessionDateApproval),
        '',
        { duration: 4000 }
      );

      const filenameBase = `Strategische Koordinationssitzung (SKS) - ${sessionType}`;
      const cmToTwips = (cm: number) => Math.round((1440 / 2.54) * cm);

      const margins = {
        top: cmToTwips(2),
        right: cmToTwips(1),
        bottom: cmToTwips(2),
        left: cmToTwips(2),
      };

      const htmlWord = `<!doctype html><html><head><meta charset="utf-8">
        <style>
          @page { margin: 1cm; size: A4; }
          body { font-family: Arial, sans-serif; }
          .page-break { page-break-before: always; }
          img { max-width: 100%; height: auto; }
        </style>
      </head><body><div style="margin:0">${target.outerHTML}</div></body></html>`;

      const blobOrBuffer = await asBlob(htmlWord, { orientation: 'portrait' as const, margins });
      const docxMime =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const docxBlob =
        blobOrBuffer instanceof Blob
          ? blobOrBuffer
          : new Blob([blobOrBuffer as unknown as ArrayBuffer], { type: docxMime });

      saveAs(docxBlob, `${filenameBase}.docx`);

      // --- PDF ---
      this.snckBar.open(
        'PDF wird generiert… ' + String(sessionType) + ' - ' + String(sessionDateApproval),
        '',
        { duration: 4000 }
      );

      await html2pdf()
        .from(target)
        .set({
          filename: `Strategische Koordinationssitzung (SKS)-${sessionType}.pdf`,
          margin: [10, 10, 16, 10],
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.no-split'] },
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

            pdf.setFillColor(255, 255, 255);
            pdf.rect(x, y - 3, textWidth, textHeight, 'F');

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(100);

            pdf.text(text, w - 10, h - 8, { align: 'right' });
          }
        })
        .save();
    } catch (error) {
      this.snckBar.open('Fehler beim Generieren des Berichts.', '', { duration: 4000 });
    } finally {
      this.isDataLoading = false;
    }
  }

  
  // Counts only rows with isPresent === true
  getPresentListCount(rows: SessionChild[] = []): number {
    return rows.reduce((n, r) => n + (r.isPresent === true ? 1 : 0), 0);
  }

    // Counts only rows with isDistributionList === true
  getDistributionListCount(rows: SessionChild[] = []): number {
    return rows.reduce((n, r) => n + (r.isDistributionList === true ? 1 : 0), 0);
  }

  // Call this after user clicks "Speichern"
  saveDetails(): void {
    // Guard: no selection or invalid form or invalid id
    const session = this.selectedNode?.data;
    if (!session || !session.id || this.detailsForm.invalid) return;

    // Build payload from form
    const patch = {
      attachments: this.detailsForm.value.attachments ?? '',
      acceptance1: this.detailsForm.value.acceptance1 ?? '',
      miscItems: this.detailsForm.value.miscItems ?? ''
    };

    // Optimistic UI: update local row immediately
    Object.assign(session, patch);
    this.sessionsGrid?.api?.refreshCells?.({
      rowNodes: [this.selectedNode!],
      columns: ['attachments', 'acceptance1', 'miscItems'],
      force: true
    });

    // Persist to backend
    this.sessionService.updateSessionDetails(session.sksNo, patch).subscribe({
      next: () => {
        this.detailsForm.markAsPristine();
        this.snckBar.open('Änderungen wurden gespeichert.', '', { duration: 2500 });
      },
      error: (err: any) => {
        console.error('Update failed', err);
        this.snckBar.open(
          'Beim Speichern ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
          '',
          { duration: 4000 }
        );
      }
    });
  }

  savePeopleAsCsv(): void {
    const session = this.selectedNode?.data;
    if (!session?.sksNo) return;

    // Safely read current row arrays bound to the two child grids
    const presentRows = this.presentUserRows ?? [];
    const distributionRows = this.distributionUserRows ?? [];

    // Collect emails from rows where the checkbox is checked
    const presentUserIds = presentRows
      .filter((r: any) => r?.isPresent === true)
      .map((r: any) => r?.id)
      .filter((e: any) => !!e)
      .map((e: string) => e.trim().toLowerCase());

    const distributionUserIds = distributionRows
      .filter((r: any) => r?.isDistributionList === true)
      .map((r: any) => r?.id)
      .filter((e: any) => !!e)
      .map((e: string) => e.trim().toLowerCase());

    // Build CSV payloads
    const presentCsv = presentUserIds.join(',');
    const distributionCsv = distributionUserIds.join(',');

    // Persist
    this.sessionService.updateSessionUsers(session.sksNo, presentCsv, distributionCsv)
      .subscribe({
        next: () => {            
            this.peopleDirty = false;
            this.snckBar.open('Teilnehmerlisten wurden gespeichert.', '', { duration: 2500 });
        },
        error: () =>
          this.snckBar.open(
            'Beim Speichern der Teilnehmerlisten ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
            '',
            { duration: 4000 }
          ),
      });
  }

}
