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
 * - Generates a Word (.docx) and a PDF report for a selected session via `ReportLoaderService`
 *   and `DocxWordService` (docx).
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
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { ReportLoaderService } from 'src/services/report-loader.service';
import saveAs from 'file-saver';
import { AG_GRID_LOCALE_DE } from 'src/helper/locale.de';
import { SessionService } from 'src/services/session.service';
import { FormBuilder, Validators } from '@angular/forms';
import { debounceTime, filter, finalize, map, switchMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NewSessionDialogComponent } from './new-session-dialog.component';
import { DocxWordService } from '../../services/docx-export.service';

// Only those docx symbols actually used here
import { Paragraph, AlignmentType, BorderStyle, TextRun, Table } from 'docx';
import { environment } from 'src/environments/environment';

/** Top-level row model representing one session. */
interface Session {
  id: string;
  reportType: string;
  sessionName: string;
  sessionDateApproval: string;
  sessionCreator: string;
  sessionDate: string;
  attachments: string;
  acceptance1: string;
  miscItems: string;
  plannedDate?: Date;
  sksNo?: number;
  errorMessage?: string;

  /** Legacy combined list (projects + people) – still used for report generation. */
  children: SessionChild[];

  /** Independent lists built once and kept on the session object. */
  childrenProjects: SessionChild[];        // only isRoadworkProject === true
  childrenPresent: SessionChild[];         // people list with isPresent flags applied from CSV
  childrenDistribution: SessionChild[];    // people list with isDistributionList flags applied from CSV

  /** Persisted CSVs (emails) */
  presentUserIds?: string;
  distributionUserIds?: string;
}

/** Child row model representing either a project (isRoadworkProject === true) or a person. */
interface SessionChild {
  /** For people: use mailAddress as id; for projects: uuid */
  id: string;
  name: string;
  isRoadworkProject: boolean;

  // fields mainly used by people rows
  department?: string;
  workArea?: string;
  mailAddress?: string;
  isPresent?: boolean;
  shouldBePresent?: boolean;
  isDistributionList?: boolean;

  roadWorkActivityNo?: string | number;
}

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.css'],
})
export class SessionsComponent implements OnInit {
  /** Busy flag toggling spinners/UX blocking. */
  isDataLoading = false;

  isRoleAdministrator = false;

  /** APIs for the sessions (master) grid. */
  sessionsApi!: GridApi;
  sessionsColumnApi!: ColumnApi;

  /** Data for the sessions (master) grid. */
  sessionsData: any[] = [];
  /** Actually selected session */
  selectedSession: Session | null = null;

  /** Derived child lists for the selected session. */
  projectRows: SessionChild[] = [];
  /** We show full people list in both grids; each grid edits its own flag. */
  presentUserRows: SessionChild[] = [];
  distributionUserRows: SessionChild[] = [];
  peopleDirty = false;

  /** Cached user and injected services. */
  userService: UserService;
  sessionService: SessionService;

  private roadWorkActivityService: RoadWorkActivityService;
  private reportLoaderService: ReportLoaderService;
  private snckBar: MatSnackBar;

  /** Locale for AG Grid UI strings. */
  localeText = AG_GRID_LOCALE_DE;

  /** Reference to the hidden report container (used for HTML preview/PDF). */
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
    private fb: FormBuilder,
    private dialog: MatDialog,
    private docxWordService: DocxWordService
  ) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.sessionService = sessionService;
    this.reportLoaderService = reportLoaderService;
    this.snckBar = snckBar;
    this.isDataLoading = true;
    this.isRoleAdministrator = this.userService.getLocalUser().chosenRole == 'administrator';

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
          plannedDate: values.plannedDate ?? '',
          reportType: values.reportType ?? '',
          presentUserIds: values.presentUserIds ?? '',
          distributionUserIds: values.distributionUserIds ?? '',
        });

        this.sessionsGrid.api.refreshCells({
          rowNodes: [this.selectedNode],
          columns: ['acceptance1', 'attachments', 'miscItems', 'plannedDate', 'reportType', 'presentUserIds', 'distributionUserIds'],
          force: true,
        });
      });
  }

  // ----------------- CSV flag helpers for people lists -----------------
  /** Normalize email/id for safe matching. */
  private normalizeEmail = (s?: string | null) => (s ?? '').trim().toLowerCase();

  /** Unique helper. */
  private unique<T>(arr: T[]) { return Array.from(new Set(arr)); }

  // UI → DB
  readonly SESSION_TYPE_TO_DB: Record<string, 'PRE_PROTOCOL' | 'PROTOCOL'> = {
    'Vor-Protokoll SKS': 'PRE_PROTOCOL',
    'Protokoll SKS':     'PROTOCOL',
  };

  // DB → UI
  readonly SESSION_TYPE_TO_UI: Record<string, string> = {
    'PRE_PROTOCOL': 'Vor-Protokoll SKS',
    'PROTOCOL':     'Protokoll SKS',
  };

  readonly SESSION_TYPE_OPTIONS = Object.keys(this.SESSION_TYPE_TO_DB);

  /** Build CSV from checked rows for the given flag, using mailAddress (id) as the key. */
  private usersToCsvIdm(
    users: SessionChild[],
    pick: 'isPresent' | 'isDistributionList'
  ): string {
    const ids = users
      .filter(u => u?.[pick] === true)
      .map(u => this.normalizeEmail(u.mailAddress ?? u.id))
      .filter(e => e.length > 0);
    return this.unique(ids).join(',');
  }

  /** Parse CSV of emails into a Set. */
  private csvToIdmSet(csv?: string | null): Set<string> {
    if (!csv) return new Set();
    return new Set(csv.split(',').map(this.normalizeEmail).filter(e => e.length > 0));
  }

  /**
   * Apply CSV flags onto a base people list:
   * - sets isPresent / isDistributionList from CSV,
   * - returns the updated list (same reference array shape).
   */
  private applyCsvFlags(
    basePeople: SessionChild[],
    presentCsv?: string | null,
    distributionCsv?: string | null
  ): SessionChild[] {
    const presentProvided = typeof presentCsv === 'string' && presentCsv.trim().length > 0;
    const distributionProvided = typeof distributionCsv === 'string' && distributionCsv.trim().length > 0;

    const presentSet = presentProvided ? this.csvToIdmSet(presentCsv) : new Set<string>();
    const distributionSet = distributionProvided ? this.csvToIdmSet(distributionCsv) : new Set<string>();

    return basePeople.map(p => {
      const idm = this.normalizeEmail(p.mailAddress ?? p.id);

      const isPresent = presentProvided
        ? presentSet.has(idm)                              // from CSV
        : (p.isPresent === true || p.shouldBePresent === true); // fallback to defaults

      const isDistributionList = distributionProvided
        ? distributionSet.has(idm)                         // from CSV
        : (p.isDistributionList === true);                 // fallback to defaults

      return { ...p, isPresent, isDistributionList } as SessionChild;
    });
  }
  // -------------------------------------------------------------------------------

  detailsForm = this.fb.group({
    plannedDate: [null, [Validators.required]],
    reportType: ['', [Validators.required]],
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
    { headerName: 'Bauvorhaben-Nummer', field: 'roadWorkActivityNo', maxWidth: 200, flex: 1 },
    { headerName: 'Bauvorhaben', field: 'name', flex: 1 },
    { headerName: 'Uuid', field: 'id' },
  ];

  /** Columns for the people grids - present users */
  peopleColDefs: ColDef[] = [
    {
      headerName: '',
      field: 'isPresent',
      maxWidth: 80,
      editable: true,
      sortable: true,
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',
      valueSetter: params => {
        // Mark grid dirty when user toggles checkbox
        const v = params.newValue === true || params.newValue === 'true';
        params.data.isPresent = v;
        this.peopleDirty = true;
        return true;
      },
    },
    { headerName: 'Name', field: 'name', width: 180 },
    { headerName: 'Werk', field: 'department', width: 100 },
    { headerName: 'Tätigkeitsgebiet', field: 'workArea', width: 100, flex: 1 },
    { headerName: 'E-Mail', field: 'mailAddress', width: 200, flex: 1 }
  ];

  /** Columns for the people grids - distribution users */
  distributionColDefs: ColDef[] = [
    {
      headerName: '',
      field: 'isDistributionList',
      maxWidth: 80,
      sortable: true,
      editable: true,
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',
      valueSetter: params => {
        // Mark grid dirty when user toggles checkbox
        const v = params.newValue === true || params.newValue === 'true';
        params.data.isDistributionList = v;
        this.peopleDirty = true;
        return true;
      }
    },
    { headerName: 'Name', field: 'name', width: 180 },
    { headerName: 'Werk', field: 'department', width: 100 },
    { headerName: 'Tätigkeitsgebiet', field: 'workArea', width: 100, flex: 1 },
    { headerName: 'E-Mail', field: 'mailAddress', width: 200, flex: 1 }
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
    { headerName: 'Sitzung', field: 'sessionName', minWidth: 220, flex: 1 },
    { headerName: 'Datum', field: 'plannedDate', minWidth: 160, flex: 1 },
    {
      headerName: 'Berichtsstatus',
      field: 'reportType',
      minWidth: 180,
      flex: 1
    },
    {
      headerName: '1. Abnahme SKS-Protokoll',
      field: 'acceptance1',
      minWidth: 400,
      tooltipField: 'acceptance1',
      flex: 1
    },
    {
      headerName: 'Teilnehmerliste',
      field: 'presentUserIds',
      minWidth: 140,
      valueGetter: p => {
        const csv = p.data?.presentUserIds as string | undefined;
        if (!csv) return '';
        return csv.split(',').map((s: string) => s.trim()).filter(Boolean).length;
      },
      tooltipValueGetter: p => (p.data?.presentUserIds ?? '').split(',').join(', '),
      type: 'numericColumn',
      filter: 'agNumberColumnFilter',
      cellClass: 'ag-right-aligned-cell',
    },
    {
      headerName: 'E-Mail-Verteiler',
      field: 'distributionUserIds',
      minWidth: 140,
      valueGetter: p => {
        const csv = p.data?.distributionUserIds as string | undefined;
        if (!csv) return '';
        return csv.split(',').map((s: string) => s.trim()).filter(Boolean).length;
      },
      tooltipValueGetter: p => (p.data?.distributionUserIds ?? '').split(',').join(', '),
      type: 'numericColumn',
      filter: 'agNumberColumnFilter',
      cellClass: 'ag-right-aligned-cell',
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
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
        } else {
          btn.addEventListener('click', () => {
            const sel = this.selectedNode?.data as Session | undefined;
            const prevDate = this.getPreviousSessionDateByPlannedDateAsc(sel ?? null) ?? this.getPreviousSessionDateBySksNo(sel ?? null);
            const nextDate = this.getNextSessionDateByPlannedDateAsc(sel ?? null);
            this.generateSessionPDF(
              params.data.reportType,
              params.data.sessionDateApproval,
              params.data.children,
              {
                'sksNo': String(this.selectedNode?.data.sksNo),
                'acceptance1': this.selectedNode?.data.acceptance1,
                'attachments': this.selectedNode?.data.attachments,
                'miscItems': this.selectedNode?.data.miscItems,
                'plannedDate': this.formatDate(this.selectedNode?.data.plannedDate),
                'isPreProtocol': this.SESSION_TYPE_TO_DB[this.selectedNode?.data.reportType] === 'PRE_PROTOCOL',
                'previousSessionDate': prevDate,
                'nextSessionDate': nextDate
              }
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
          d.reportType,
          d.sessionName,
          d.sessionDateApproval,
          d.sessionCreator,
          d.sessionDate,
          projectNames,
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
          id: String(idx + 1),
          reportType: this.SESSION_TYPE_TO_UI[row.reportType] ?? this.SESSION_TYPE_TO_UI["PRE_PROTOCOL"],
          sessionName: 'Sitzung ' + (row.plannedDate?.getMonth() + 1) + '-' + row.plannedDate?.getFullYear(),
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

            // Build base people once; id/mailAddress = email; flags will be set from CSV
            const basePeople: SessionChild[] = (users ?? []).map((user) => ({
              id: user.mailAddress,                                  // key = email
              name: `${user.firstName} ${user.lastName}`,
              isRoadworkProject: false,
              department: user.organisationalUnit?.abbreviation ?? '',
              workArea: user.workArea ?? '',
              mailAddress: user.mailAddress ?? '',
              // keep default flags exactly as before (used when CSV is empty)
              isPresent: user.isParticipantList === true,
              shouldBePresent: user.isParticipantList === true,
              isDistributionList: user.isDistributionList === true
            }));

            // Track matched activity UUIDs to later build the "Unbekannt" session
            const matchedActivityIds = new Set<string>();

            // Enrich each real session with projects and users+flags from CSV
            const enriched = sessions.map(s => {
              const key = toIsoDateOnly(s.plannedDate);
              const acts = actsByDate.get(key) ?? [];

              // Mark matched activities
              for (const act of acts) {
                const uuid = act?.properties?.uuid;
                if (uuid) matchedActivityIds.add(uuid);
              }

              // Projects linked by date
              const childrenProjects: SessionChild[] = acts.map(act => {
                const { type, section, name } = act.properties;
    
                const joinedName = [type, section, name]
                    .filter((v) => v && String(v).trim().length > 0)
                    .join(' / ');

                  return {
                    id: String(act.properties.uuid),
                    name: joinedName, 
                    roadWorkActivityNo: act.properties.roadWorkActivityNo,
                    isRoadworkProject: true,
                    sessionComment1: act.properties.sessionComment1,
                    sessionComment2: act.properties.sessionComment2,
                    notAssignedNeeds: [],
                  };
                }
              );

              // Unique people by email (base list)
              const uniq = new Map<string, SessionChild>();
              for (const p of basePeople) {
                const k = this.normalizeEmail(p.mailAddress ?? p.id);
                if (!uniq.has(k)) uniq.set(k, p);
              }
              const allPeopleBase = Array.from(uniq.values());

              // Apply CSV flags from this session row
              const allPeopleWithFlags = this.applyCsvFlags(
                allPeopleBase,
                s.presentUserIds,
                s.distributionUserIds
              );

              // For the legacy combined "children" keep projects + all people
              const children = [...childrenProjects, ...allPeopleWithFlags];

              // Also keep per-grid source arrays (we show all people in both grids)
              return {
                ...s,
                childrenProjects,
                childrenPresent: allPeopleWithFlags,       // grid uses isPresent flag
                childrenDistribution: allPeopleWithFlags,  // grid uses isDistributionList flag
                children,
              };
            });

            // Build dummy "Unbekannt" session for activities not matched by date
            const unmatchedActs = (activities ?? []).filter(
              a => a?.properties?.uuid && !matchedActivityIds.has(a.properties.uuid)
            );

            if (unmatchedActs.length > 0) {
              const unknownProjects: SessionChild[] = unmatchedActs.map(act => {
              const { type, section, name } = act.properties;
              
              const joinedName = [type, section, name]
                .filter(v => v && String(v).trim().length > 0)
                .join(' / ');

              return {
                id: String(act.properties.uuid),
                name: joinedName,
                isRoadworkProject: true,
                roadWorkActivityNo: act.properties.roadWorkActivityNo,
              };
            });

              // Reuse base people; unknown session has empty CSV (no pre-selections)
              const uniq = new Map<string, SessionChild>();
              for (const p of basePeople) {
                const k = this.normalizeEmail(p.mailAddress ?? p.id);
                if (!uniq.has(k)) uniq.set(k, p);
              }
              const allPeopleBase = Array.from(uniq.values());
              const allPeopleUnknown = this.applyCsvFlags(allPeopleBase, '', '');

              const unknownSession: Session = {
                id: null as any,
                reportType: '-',
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
                childrenPresent: allPeopleUnknown,
                childrenDistribution: allPeopleUnknown,
                children: [...unknownProjects, ...allPeopleUnknown],
                presentUserIds: '',
                distributionUserIds: ''
              };

              enriched.push(unknownSession);
            }

            // Keep "Unbekannt" at the end; otherwise sort by date desc
            const sorted = enriched.sort((a, b) => {
              if (a.id === 'unbekannt') return 1;
              if (b.id === 'unbekannt') return -1;
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
    const nodes = this.sessionsGrid?.api?.getSelectedNodes?.() ?? [];
    this.selectedNode = nodes[0] ?? null;

    if (!this.selectedNode) {
      this.projectRows = [];
      this.presentUserRows = [];
      this.distributionUserRows = [];

      this.detailsForm.reset({ acceptance1: '', attachments: '', miscItems: '' });
      this.detailsForm.disable({ emitEvent: false });
      return;
    }

    const session: Session = this.selectedNode.data;

    // Enable and patch the details form with values from the selected session
    this.detailsForm.enable({ emitEvent: false });
    this.detailsForm.patchValue(
      {
        plannedDate: session?.plannedDate ?? null,
        reportType: session?.reportType ?? '',
        acceptance1: session?.acceptance1 ?? '',
        attachments: session?.attachments ?? '',
        miscItems: session?.miscItems ?? '',
      },
      { emitEvent: false }
    );

    // Push prebuilt lists into the child grids
    // We show full people list in both grids; each grid edits its own flag.
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
    const all = e.columnApi.getAllColumns() || [];
    e.columnApi.autoSizeColumns(all);
  }

  /**
   * Report generation (DOCX).
   */
  async generateSessionPDF(
    reportType: string,
    sessionDateApproval: string,
    children: any[],
    session: any
  ): Promise<void> {
    this.isDataLoading = true;

    try {
      await this.downloadWord(children, reportType, session);      
    } catch (error) {
      this.snckBar.open('Fehler beim Generieren des Berichts.', '', { duration: 4000 });
      console.log(error);
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
    const session = this.selectedNode?.data;
    if (!session || !session.id || this.detailsForm.invalid) return;

    const uiLabel = this.detailsForm.value.reportType || '';

    const patch = {
      plannedDate: this.detailsForm.value.plannedDate,
      reportType:  this.SESSION_TYPE_TO_DB[uiLabel] ?? null,
      attachments: this.detailsForm.value.attachments ?? '',
      acceptance1: this.detailsForm.value.acceptance1 ?? '',
      miscItems:   this.detailsForm.value.miscItems ?? ''
    };

    Object.assign(session, { ...patch, reportType: uiLabel });

    this.sessionsGrid?.api?.refreshCells?.({
      rowNodes: [this.selectedNode!],
      columns: ['acceptance1', 'attachments', 'miscItems', 'plannedDate', 'reportType', 'presentUserIds', 'distributionUserIds'],
      force: true
    });

    this.isDataLoading = true;
    this.sessionService.updateSessionDetails(session.sksNo, patch).pipe(
      finalize(() => this.isDataLoading = false)
    ).subscribe({
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

  // Save CSV that contains mailAddress (user id) based on current checkboxes
  savePeopleAsCsv(): void {
    const session = this.selectedNode?.data;
    if (!session?.sksNo) return;

    // Read current arrays shown in grids (full people list in each grid)
    const presentRows = this.presentUserRows ?? [];
    const distributionRows = this.distributionUserRows ?? [];

    // Build CSV payloads from mailAddress (id)
    const presentCsv = this.usersToCsvIdm(presentRows, 'isPresent');
    const distributionCsv = this.usersToCsvIdm(distributionRows, 'isDistributionList');

    // Optimistic UI: update the master row cells immediately
    session.presentUserIds = presentCsv;
    session.distributionUserIds = distributionCsv;
    this.sessionsGrid?.api?.refreshCells?.({
      rowNodes: [this.selectedNode!],
      columns: ['presentUserIds', 'distributionUserIds'],
      force: true
    });

    // Persist
    this.isDataLoading = true;
    this.sessionService.updateSessionUsers(session.sksNo, presentCsv, distributionCsv).pipe(
      finalize(() => this.isDataLoading = false)
    )
      .subscribe({
        next: () => {
          this.peopleDirty = false;
          this.snckBar.open('Teilnehmerlisten wurden gespeichert.', '', { duration: 2500 });
          this.presentGrid?.api?.refreshCells({ force: true });
          this.distributionGrid?.api?.refreshCells({ force: true });
        },
        error: () =>
          this.snckBar.open(
            'Beim Speichern der Teilnehmerlisten ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
            '',
            { duration: 4000 }
          ),
      });
  }

  // Open dialog and create session
  openNewSessionDialog(): void {
    const ref = this.dialog.open(NewSessionDialogComponent, { width: '640px' });
    ref.afterClosed().subscribe(payload => {
      if (!payload) return;

      this.isDataLoading = true;
      this.sessionService.createSession({
        plannedDate: payload.plannedDate,
        reportType:  this.SESSION_TYPE_TO_DB[payload.reportType] ?? this.SESSION_TYPE_TO_DB["PRE_PROTOCOL"],
        acceptance1: payload.acceptance1,
        attachments: payload.attachments,
        miscItems: payload.miscItems,
        presentUserIds: '',
        distributionUserIds: '',
      }).pipe(
        finalize(() => this.isDataLoading = false)
      ).subscribe({
        next: (created) => {
          // Insert into grid model and re-enrich minimally
          const sessionRow = {
            id: this.sessionsData.length + 1,
            reportType: this.SESSION_TYPE_TO_UI[created.reportType] ?? this.SESSION_TYPE_TO_UI["PRE_PROTOCOL"],
            sessionName: 'Sitzung ' + (new Date(created.plannedDate).getMonth() + 1) + '-' + new Date(created.plannedDate).getFullYear(),
            sessionDateApproval: String(created.plannedDate).slice(0, 10),
            sessionDate: String(created.plannedDate),
            plannedDate: new Date(created.plannedDate),
            sksNo: created.sksNo,
            sessionCreator: '',
            acceptance1: created.acceptance1 ?? '-',
            attachments: created.attachments ?? '-',
            miscItems: created.miscItems ?? '-',
            errorMessage: '',
            presentUserIds: created.presentUserIds ?? '',
            distributionUserIds: created.distributionUserIds ?? '',
            childrenProjects: [],
            childrenPresent: [],
            childrenDistribution: [],
            children: []
          };

          this.sessionsData = [sessionRow, ...this.sessionsData]
            .sort((a, b) => {
              const da = a?.plannedDate ? new Date(a.plannedDate).getTime() : -Infinity;
              const db = b?.plannedDate ? new Date(b.plannedDate).getTime() : -Infinity;
              return db - da; // desc
            });

          // Refresh and select the newly created row
          setTimeout(() => {
            this.sessionsGrid?.api?.setRowData(this.sessionsData);
            const idx = this.sessionsData.findIndex(r => r.sksNo === created.sksNo);
            if (idx >= 0) {
              this.sessionsGrid.api.ensureIndexVisible(idx);
              this.sessionsGrid.api.getDisplayedRowAtIndex(idx)?.setSelected(true);
            }
            this.snckBar.open('Neue Sitzung wurde erstellt.', '', { duration: 2500 });
          }, 0);
        },
        error: () => {
          this.snckBar.open(
            'Beim Erstellen der Sitzung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
            '', { duration: 4000 }
          );
        },
        complete: () => this.isDataLoading = false
      });
    });
  }

  /** Normalize to YYYY-MM-DD (null → null) */
  private toIsoDateOnly(d: any): string | null {
    if (!d) return null;
    const dt = (d instanceof Date) ? d : new Date(d);
    return isNaN(+dt) ? null : dt.toISOString().slice(0, 10);
  }

  private getPreviousSessionDateBySksNo(current: Session | null): string | null {
    if (!current || typeof current.sksNo !== 'number') return null;
    const prev = this.sessionsData.find(s => s?.sksNo === current.sksNo! - 1);
    return prev ? this.toIsoDateOnly(prev.plannedDate) : null;
  }

  private getPreviousSessionDateByPlannedDateAsc(current: Session | null): string | null {
    if (!current) return null;

    const withDate = (this.sessionsData ?? [])
      .filter(s => !!this.toIsoDateOnly(s.plannedDate))
      .slice();

    // sort ASC
    withDate.sort((a, b) => {
      const ad = new Date(a.plannedDate as any).getTime();
      const bd = new Date(b.plannedDate as any).getTime();
      return ad - bd;
    });

    const idx = withDate.findIndex(s =>
      (typeof s.sksNo === 'number' && typeof current.sksNo === 'number' && s.sksNo === current.sksNo) ||
      s === current
    );

    if (idx <= 0) return null;
    return this.toIsoDateOnly(withDate[idx - 1].plannedDate);
  }

  private getNextSessionDateByPlannedDateAsc(current: Session | null): string | null {
    if (!current) return null;

    const withDate = (this.sessionsData ?? [])
      .filter(s => !!this.toIsoDateOnly(s.plannedDate))
      .slice();

    withDate.sort((a, b) => {
      const ad = new Date(a.plannedDate as any).getTime();
      const bd = new Date(b.plannedDate as any).getTime();
      return ad - bd;
    });

    const idx = withDate.findIndex(s =>
      (typeof s.sksNo === 'number' && typeof current.sksNo === 'number' && s.sksNo === current.sksNo) ||
      s === current
    );

    if (idx < 0 || idx >= withDate.length - 1) return null;

    return this.toIsoDateOnly(withDate[idx + 1].plannedDate);
  }


  // ----------------------------- DOCX download -------------------------------

  async downloadWord(children: SessionChild[], reportType: string, session: any) {
    // Build intro elements as normal body children (not a header)
    const intro = await this.docxWordService.makeIntroBlock.call(this.docxWordService, {
      logoUrl: "assets/win_logo.png",
      addressLines: [
        'Stadt Winterthur',
        '*Tiefbauamt*',
        'Pionierstrasse 7',
        '8403 Winterthur',
        ''        
      ],
      title: 'Strategische Koordinationssitzung (SKS)' + ' - ' + reportType,      
      logoWidthPx: 140,
    });

    // 1) Info + three canonical tables
    const projectInfo = [
      { key: 'Datum und Zeit', value: String(session.plannedDate) + ' / von 10.30 - 12.00 Uhr' },
      { key: 'Ort', value: 'Stadt Winterthur, Departement Bau und Mobilität, Tiefbauamt, Superblock' },
      { key: '', value: 'Pionierstrasse 7 (Sitzungszimmer SZ Public B001 PION5)' },
      { key: 'Vorsitz', value: environment.reportChairperson + '.' },
      { key: 'Protokoll', value: environment.reportWriter  + '.'},
      { key: 'SKS-Nr', value: String(session.sksNo) },
    ];

    const tableInfo        = this.docxWordService.makeInfoTable(projectInfo);
    const tableExcused     = this.docxWordService.makeExcusedPersonsTable(children);
    const tablePresent     = this.docxWordService.makePresentPersonsTable(children);
    const tableDistribution= this.docxWordService.makeDistributionPersonsTable(children);

    const t1 = this.docxWordService.pBold('Anwesende');    
    const t2 = this.docxWordService.pBold('Entschuldigt');    
    const t3 = this.docxWordService.pBold('Verteiler');    

    const gap = this.docxWordService.spacer();
    const smallGap = this.docxWordService.smallGap();

    const agendaSection = this.docxWordService.makeAgendaAndAttachmentsSection( { 
                                                                                  protocolDate: String(session.plannedDate), 
                                                                                  attachments: session.attachments,
                                                                                  isPreProtocol: session.isPreProtocol } );

    const protocolSection = this.docxWordService.makeProtocolSections({
      lastSksDate: session.previousSessionDate,
      sksDate: session.plannedDate,
      nextSksDate: session.nextSessionDate,
      acceptanceText: session.acceptance1 || '',
      reportType: reportType,
      isPreProtocol: session.isPreProtocol,
    });

    // 2) Attach project images (100% content width), each with title/department
    const activities = await this.docxWordService.prepareRoadWorkActivity(this.projectRows);
    const allProjectBlocks: Array<Paragraph | Table> = [];    
    
    for (const activity of activities) {    
      allProjectBlocks.push(
        this.docxWordService.makeFullWidthTitle(
          `Bauvorhaben:`,
          { bgColor: "E0E0E0", sizeHalfPt: 34, pageBreakBefore:true } 
        )
      );
      allProjectBlocks.push(
        this.docxWordService.makeFullWidthTitle(
          `${activity.project.roadWorkActivityNo ?? ''} / ${activity.project.name ?? ''} / ${activity.project.section ?? ''}`,
          { bgColor: "E0E0E0", sizeHalfPt: 34, pageBreakBefore: false } 
        )
      );

      const smallGap = this.docxWordService.smallGap();
      allProjectBlocks.push(smallGap);

      // map
      const imageRun = await this.docxWordService.imageFromUrlFitted(activity.mapUrl, 520);
      if (imageRun) {
        allProjectBlocks.push(new Paragraph({ alignment: AlignmentType.LEFT, children: [imageRun] }));
      }

      // META: Auslösende:r, Werk, GM, Mitwirkende 
      allProjectBlocks.push(...this.docxWordService.makeProjectMetaBlock(activity.meta));

      // Assigned Needs (per projekt)
      allProjectBlocks.push(
        this.docxWordService.smallGap(),
        this.docxWordService.pBold('Zugewiesene (berücksichtigte) Bedarfe'),        
        this.docxWordService.makeNeedsTableFromRows(activity.assignedNeedsRows, reportType),
        this.docxWordService.spacer()
      );
                  
      allProjectBlocks.push(this.docxWordService.smallGap());
      allProjectBlocks.push(this.docxWordService.pBold('Stellungnahme'));      

      allProjectBlocks.push(this.docxWordService.smallGap());
      allProjectBlocks.push(this.docxWordService.pBold(session.isPreProtocol ? 'Vorgehenvorschlag' : 'Vorgehen'));
      allProjectBlocks.push(this.docxWordService.p(activity.project.sessionComment1));

      allProjectBlocks.push(this.docxWordService.smallGap());
      allProjectBlocks.push(this.docxWordService.pBold('Nicht zugewiesene Bedarfe in Vorhabenfläche'));
      allProjectBlocks.push(this.docxWordService.makeNeedsTableFromRows(activity.notAssignedNeedsRows, reportType));
      allProjectBlocks.push(this.docxWordService.spacer());
   
      allProjectBlocks.push(this.docxWordService.smallGap());
      allProjectBlocks.push(this.docxWordService.pBold(`Beschluss:`));
      allProjectBlocks.push(this.docxWordService.p(activity.project.sessionComment2));   
    }    

    // 3. Verschiedenes    
    const miscItemsSection = this.docxWordService.makeMiscItemsSection({miscItems: session.miscItems});    

    // 4. Nächste Sitzungen
    const nextSessionSection = this.docxWordService.makeNextSessionSection({
      nextSKSDate: session.nextSessionDate,
      nextOKSDate: session.nextOKSDate || '-',
      nextKAPDate:  session.nextKAPDate || '-',
      currentDate:  this.formatDate(new Date()),
      reportWriter: environment.reportWriter || '-',
    });


 
    const separator = new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, color: 'CCCCCC', size: 6 } },
      spacing: { before: 60, after: 120 },
    });

    let mailAddress = this.userService.getLocalUser().mailAddress;
    // 3) Build the document
    const blob = await this.docxWordService.build({
      username: mailAddress,
      orientation: 'portrait',
      marginsCm: { top: 2, right: 1, bottom: 2, left: 2 },
      children: [        
        ...intro,
        separator,
        gap,
        tableInfo, gap,
        t1, tablePresent, gap,
        t2, tableExcused, gap,
        t3, tableDistribution, gap,
        ...agendaSection,
        gap,
        ...protocolSection,
        ...allProjectBlocks,
        ...miscItemsSection,
        ...nextSessionSection
      ],
    });

    saveAs(blob, 'WOW-Strategische Koordinationssitzung (SKS) - ' + reportType + '.docx');
  }

  
  formatDate(dateInput: string | Date): string {
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

}
