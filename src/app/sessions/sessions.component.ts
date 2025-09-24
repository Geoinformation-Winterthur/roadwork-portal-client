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

/** Top-level row model representing one session. */
interface Session {
  id: string;
  sessionType: string;
  sessionName: string;
  sessionDateApproval: string;
  sessionCreator: string;
  sessionDate: string;

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
  sessionsData: Session[] = [];
  /** Actually selected session */
  selectedSession: Session | null = null;

  /** Derived child lists for the selected session. */
  projectRows: SessionChild[] = [];
  presentUserRows: SessionChild[] = [];
  distributionUserRows: SessionChild[] = [];

  /** Cached user and injected services. */
  user: User = new User();
  userService: UserService;

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
  @ViewChild('projectsGrid') projectsGrid?: AgGridAngular;
  @ViewChild('presentGrid') presentGrid?: AgGridAngular;
  @ViewChild('distributionGrid') distributionGrid?: AgGridAngular;

  constructor(
    roadWorkActivityService: RoadWorkActivityService,
    reportLoaderService: ReportLoaderService,
    userService: UserService,
    snckBar: MatSnackBar
  ) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.reportLoaderService = reportLoaderService;
    this.snckBar = snckBar;
    this.isDataLoading = true;
  }

  /**
   * Grid defaults (community-only features):
   * - Sorting/resizing
   * - Text filter
   * - Single-click edit where relevant
   */
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: 'agTextColumnFilter',
    menuTabs: ['filterMenuTab'],
    flex: 1,
    minWidth: 80,
  };

  /** Slightly simplified defaults for child grids. */
  childDefaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: 'agTextColumnFilter',
    menuTabs: ['filterMenuTab'],
    flex: 1,
    minWidth: 30,
  };

  /** Columns for the sessions (master) grid. */
  sessionsColDefs: ColDef[] = [
    { headerName: 'Sitzung', field: 'sessionName', minWidth: 220 },
    { headerName: 'Datum Genehmigung', field: 'sessionDateApproval', minWidth: 160 },
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
    },
    {
      headerName: 'Bericht',
      minWidth: 160,
      cellRenderer: (params: any) => {
        // Simple DOM button avoids any enterprise renderers.
        const btn = document.createElement('button');
        btn.textContent = 'Bericht anzeigen';
        btn.addEventListener('click', () =>
          this.generateSessionPDF(
            params.data.id,
            params.data.sessionType,
            params.data.sessionDateApproval,
            params.data.children
          )
        );
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

  /** Columns for the projects grid. */
  projectsColDefs: ColDef[] = [
    { headerName: 'Id', field: 'id', minWidth: 120 },
    { headerName: 'Bauvorhaben', field: 'name', minWidth: 220 },
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
    { headerName: 'E-Mail', field: 'mailAddress', minWidth: 160 }
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
    { headerName: 'E-Mail', field: 'mailAddress', minWidth: 160 }
  ];

  /**
   * Initialization:
   * - Load current user
   * - Load activities → transform to sessions
   * - Enrich sessions with people (present/distribution) derived from env rules
   */
  ngOnInit(): void {
    this.userService
      .getUserFromDB(this.userService.getLocalUser().mailAddress)
      .subscribe({
        next: users => {
          if (users && users.length > 0 && users[0]) {
            const u = users[0];
            ErrorMessageEvaluation._evaluateErrorMessage(u);
            if (u?.errorMessage?.trim().length) {
              this.snckBar.open(u.errorMessage, '', { duration: 4000 });
            } else {
              this.user = u;
            }
          }
          this.isDataLoading = false;
        },
        error: () => {
          this.snckBar.open(
            'Beim Laden von Benutzerdaten ist ein Systemfehler aufgetreten. Bitte wenden Sie sich an den Administrator.',
            '',
            { duration: 4000 }
          );
          this.isDataLoading = false;
        },
      });    
    
    // Activities → Sessions → Sessions + users (present / distribution)
    const sessionsWithUsers$ = this.roadWorkActivityService.getRoadWorkActivities().pipe(
      map((activities: RoadWorkActivityFeature[]) => this.transformToSessions(activities)),
      switchMap((sessions: Session[]) =>
        this.userService.getAllUsers().pipe(
          map(users => {

            const people: SessionChild[] = users.map((user, idx) => {
              const isPresent = user.isParticipantList;
              const isDistributionList = user.isDistributionList;

              return {
                id: String(idx + 1),
                name: `${user.firstName} ${user.lastName}`,
                isRoadworkProject: false,
                department: user.organisationalUnit?.abbreviation ?? '',
                mailAddress: user.mailAddress ?? '',
                isPresent,
                shouldBePresent: isPresent,
                isDistributionList,                
              };
            });

            // Build all three independent lists ONCE per session
            return sessions.map(session => {
              // 1) Projects are already in session.children from transformToSessions
              const childrenProjects = session.children.filter(c => c.isRoadworkProject === true);

              // 2) People lists are independent (not derived from 'children' at runtime)
              const childrenPresent = people.filter(p => p.isPresent === true);
              const childrenDistribution = people.filter(p => p.isDistributionList === true);

              // Keep legacy 'children' for report generation (deduplicated people)
              const uniqueByEmail = new Map<string, SessionChild>();
              for (const p of [...childrenPresent, ...childrenDistribution]) {
                const key = (p.mailAddress ?? p.id).toLowerCase();
                if (!uniqueByEmail.has(key)) uniqueByEmail.set(key, p);
              }
              const allPeople = Array.from(uniqueByEmail.values());
              const combinedChildren = [...childrenProjects, ...allPeople];

              return {
                ...session,
                children: combinedChildren,
                childrenProjects,
                childrenPresent,
                childrenDistribution
              };
            });
          })
        )
      )
    );

    sessionsWithUsers$.subscribe({
      next: sessions => {
        this.sessionsData = sessions;
        // Auto-select the first session after data arrives.
        setTimeout(() => {
          if (this.sessionsApi && this.sessionsData.length > 0) {
            this.sessionsApi.ensureIndexVisible(0);
            const first = this.sessionsApi.getDisplayedRowAtIndex(0);
            first?.setSelected(true);
          }
        }, 0);
      },
      error: console.error,
    });
  }

  /** AG Grid callback for the sessions grid. */
  onSessionsGridReady(e: GridReadyEvent) {
    this.sessionsApi = e.api;
    this.sessionsColumnApi = e.columnApi;
  }

  /** Handle selection change on the sessions grid and push prebuilt lists into child grids. */
  onSessionSelectionChanged() {
    const selected = this.sessionsApi?.getSelectedRows?.() ?? [];
    this.selectedSession = selected[0];
    const session: Session | undefined = selected[0];    

    if (!session) {
      this.projectRows = [];
      this.presentUserRows = [];
      this.distributionUserRows = [];
      return;
    }

    // Use prebuilt independent lists stored on the session
    this.projectRows = session.childrenProjects ?? [];
    this.presentUserRows = session.childrenPresent ?? [];
    this.distributionUserRows = session.childrenDistribution ?? [];
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
    id: string,
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
        id
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

  /**
   * Transform a flat list of activities into grouped sessions.
   * Group key: `dateSksPlanned` (as string) or "unknown".
   * Session label: "Sitzung N/YYYY" with per-year numbering.
   * Each session initially contains only project children. People are added later.
   */
  private transformToSessions(activities: RoadWorkActivityFeature[]): Session[] {
    const groups = new Map<string, RoadWorkActivityFeature[]>();

    for (const act of activities) {
      const dateKey = act.properties.dateSksPlanned?.toString() ?? 'unknown';
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(act);
    }

    const knownKeys = [...groups.keys()].filter(k => k !== 'unknown').sort();
    const dateKeys = [...knownKeys, ...(groups.has('unknown') ? ['unknown'] : [])];

    const yearCount = new Map<string, number>();
    const sessions: Session[] = [];

    for (const dateKey of dateKeys) {
      const acts = groups.get(dateKey)!;
      const first = acts[0];

      let sessionName = 'Sitzung ?/unbekannt';
      if (dateKey !== 'unknown') {
        const year = dateKey.slice(0, 4);
        const n = (yearCount.get(year) ?? 0) + 1;
        yearCount.set(year, n);
        sessionName = `Sitzung ${n}/${year}`;
      }

      
      const projectChildren: SessionChild[] = acts.map(act => ({
        id: act.properties.uuid,
        name: `${act.properties.type} / ${act.properties.section || act.properties.name}`,
        isRoadworkProject: true,
      }));

      sessions.push({
        id: first.properties.uuid,
        sessionType: 'Vor-Protokol SKS',
        sessionName,
        sessionDateApproval: (dateKey.split('T')[0] || '').trim(),
        sessionCreator: first.properties.areaManager?.firstName ?? '',
        sessionDate: first.properties.created?.toString() ?? '',

        // legacy combined list (projects only for now; people get added later)
        children: [...projectChildren],

        // three independent lists (prebuilt; people will be filled later)
        childrenProjects: [...projectChildren],
        childrenPresent: [],
        childrenDistribution: [],
      });

    }

    return sessions;
  }

  // Counts only rows with isPresent === true
  getPresentListCount(rows: SessionChild[] = []): number {
    return rows.reduce((n, r) => n + (r.isPresent === true ? 1 : 0), 0);
  }

    // Counts only rows with isDistributionList === true
  getDistributionListCount(rows: SessionChild[] = []): number {
    return rows.reduce((n, r) => n + (r.isDistributionList === true ? 1 : 0), 0);
  }
}
