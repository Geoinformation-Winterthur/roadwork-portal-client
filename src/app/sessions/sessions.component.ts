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
import { Paragraph, AlignmentType, BorderStyle, Table } from 'docx';
import { environment } from 'src/environments/environment';

/** Top-level row model representing one session. */
interface Session {
  id: string;
  reportType: string;
  sessionName: string;
  sessionCreator: string;
  prevSessionDate: string;
  sessionDate: string;
  nextSessionDate: string;
  attachments: string;
  acceptance1: string;
  miscItems: string;
  plannedDate?: Date;
  sksNo?: number;
  errorMessage?: string;

  location?: string;
  timeWindow?: string;
  chairperson?: string;
  minuteTaker?: string;

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

const LS_KEY_SELECTED_SESSION = 'sks.selectedSession';
const LS_KEY_SELECTED_PROJECT = 'sks.selectedProject';

const TITLE_PROTOCOL_NAME = "SKS (Strategische Koordinationssitzung)";

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
  nextSessionDateOKS: string | null = null;
  nextSessionDateKAP: string | null = null;

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

        Object.assign(this.selectedNode.data, {
          acceptance1: values.acceptance1 ?? '',
          attachments: values.attachments ?? '',
          miscItems: values.miscItems ?? '',
          plannedDate: values.plannedDate ?? '',
          reportType: values.reportType ?? '',
          location: values.location ?? '',
          timeWindow: values.timeWindow ?? '',
          chairperson: values.chairperson ?? '',
          minuteTaker: values.minuteTaker ?? '',
          presentUserIds: values.presentUserIds ?? '',
          distributionUserIds: values.distributionUserIds ?? '',
        });

        this.sessionsGrid.api.refreshCells({
          rowNodes: [this.selectedNode],
          columns: [
            'acceptance1',
            'attachments',
            'miscItems',
            'plannedDate',
            'reportType',
            'location',
            'timeWindow',
            'chairperson',
            'minuteTaker',
            'presentUserIds',
            'distributionUserIds'
          ],
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
    'Vor-Protokoll': 'PRE_PROTOCOL',
    'Protokoll':     'PROTOCOL',
  };

  // DB → UI
  readonly SESSION_TYPE_TO_UI: Record<string, string> = {
    'PRE_PROTOCOL': 'Vor-Protokoll',
    'PROTOCOL':     'Protokoll',
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
        ? presentSet.has(idm)
        : (p.isPresent === true || p.shouldBePresent === true);

      const isDistributionList = distributionProvided
        ? distributionSet.has(idm)
        : (p.isDistributionList === true);

      return { ...p, isPresent, isDistributionList } as SessionChild;
    });
  }
  // -------------------------------------------------------------------------------

  detailsForm = this.fb.group({
    plannedDate: [null, [Validators.required]],
    reportType: ['', [Validators.required]],
    location: ['', [Validators.maxLength(500)]],
    timeWindow: ['', [Validators.maxLength(100)]],
    chairperson: ['', [Validators.maxLength(300)]],
    minuteTaker: ['', [Validators.maxLength(300)]],
    acceptance1: ['', [Validators.maxLength(10000)]],
    attachments: ['', [Validators.maxLength(10000)]],
    miscItems: ['', [Validators.maxLength(10000)]],
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
    {
      headerName: 'Bauvorhaben-Nr',
      field: 'roadWorkActivityNo',
      maxWidth: 200,
      flex: 1,
      sort: 'desc',
      sortingOrder: ['desc', 'asc', null]
    },
    { headerName: 'Bauvorhaben', field: 'name', flex: 1 },
    {
      headerName: 'Link',
      field: 'id',
      flex: 1,
      maxWidth: 320,
      cellRenderer: ({ data }: any) => {
        const projectId = data?.id ?? '';
        const url = `/civil-engineering/roadworks-portal/activities/${projectId}`;

        return `
          <a href="${url}"
            title="${projectId}"
            style="color:#0066cc; text-decoration:underline; cursor:pointer;">
            Bauvorhaben anzeigen
          </a>
        `;
      },
    }
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
      width: 130,
      suppressSizeToFit: true,
      filter: 'agNumberColumnFilter',
      sort: 'desc'
    },
    {
      headerName: 'Datum',
      field: 'plannedDate',
      minWidth: 160,
      flex: 1,
      valueFormatter: params => {
        if (!params.value) return '';
        const d = new Date(params.value);
        if (isNaN(d.getTime())) return '';

        const day   = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year  = d.getFullYear();

        return `${day}.${month}.${year}`;
      }
    },
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
      headerName: 'Verteiler',
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

        if (!params.data?.id) {
          btn.disabled = true;
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
        } else {
          btn.addEventListener('click', () => {
            const sel = this.selectedNode?.data as Session | undefined;
            const prevSessionDate = this.getPreviousSessionDateByPlannedDateAsc(sel ?? null) ?? this.getPreviousSessionDateBySksNo(sel ?? null);
            const nextSessionDate = this.getNextSessionDateByPlannedDateAsc(sel ?? null);
            this.generateSessionPDF(
              params.data.reportType,
              params.data.children,
              {
                'sksNo': String(this.selectedNode?.data.sksNo),
                'acceptance1': this.selectedNode?.data.acceptance1,
                'attachments': this.selectedNode?.data.attachments,
                'miscItems': this.selectedNode?.data.miscItems,
                'plannedDate': this.formatDate(this.selectedNode?.data.plannedDate),
                'reportType': this.selectedNode?.data.reportType,
                'location': this.selectedNode?.data.location,
                'timeWindow': this.selectedNode?.data.timeWindow,
                'chairperson': this.selectedNode?.data.chairperson,
                'minuteTaker': this.selectedNode?.data.minuteTaker,
                'isPreProtocol': this.SESSION_TYPE_TO_DB[this.selectedNode?.data.reportType] === 'PRE_PROTOCOL',
                'prevSessionDate': prevSessionDate,
                'nextSessionDate': nextSessionDate
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

        const roadworkActivitiesNos = projects
          .map((c: any) => String(c?.roadWorkActivityNo) ?? '')
          .filter(Boolean)
          .join(' ');

        return [
          d.reportType,
          d.sessionName,
          d.sessionCreator,
          d.sessionDate,
          d.location,
          d.timeWindow,
          d.chairperson,
          d.minuteTaker,
          projectNames,
          roadworkActivitiesNos
        ]
          .filter(Boolean)
          .join(' ');
      },
    },
  ];

  ngOnInit(): void {
    this.isDataLoading = true;

    this.sessionService.getAll().pipe(
      map((rows) => {

        const now = new Date();

        const futureOKS = rows
          .filter(r => r.dateType?.toUpperCase() === 'OKS' && r.plannedDate && r.plannedDate >= now)
          .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime());

        this.nextSessionDateOKS = this.formatDate(futureOKS[0]?.plannedDate ?? null);

        const futureKAP = rows
          .filter(r => r.dateType?.toUpperCase() === 'KAP' && r.plannedDate && r.plannedDate >= now)
          .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime());

        this.nextSessionDateKAP = this.formatDate(futureKAP[0]?.plannedDate ?? null);

        this.sessionsData = rows
          .filter(row => row.dateType?.toUpperCase() === 'SKS')
          .map((row, idx) => ({
            id: String(idx + 1),
            reportType: this.SESSION_TYPE_TO_UI[row.reportType] ?? this.SESSION_TYPE_TO_UI["PRE_PROTOCOL"],
            sessionName: 'Sitzung ' + row.sksNo,
            sessionDate: row.plannedDate?.toString() ?? '',
            plannedDate: row.plannedDate,
            sksNo: row.sksNo,
            sessionCreator: row.sessionCreator ?? '',
            acceptance1: row.acceptance1 || '-',
            attachments: row.attachments || '-',
            miscItems: row.miscItems || '-',
            errorMessage: row.errorMessage || '',
            location: row.location || '',
            timeWindow: row.timeWindow || '',
            chairperson: row.chairperson || '',
            minuteTaker: row.minuteTaker || '',
            presentUserIds: row.presentUserIds || '',
            distributionUserIds: row.distributionUserIds || '',
            childrenPresent: [],
            childrenDistribution: [],
            childrenProjects: [],
            children: []
          }));
        return this.sessionsData;
      }),

      switchMap((sessions) => {
        if (!sessions || sessions.length === 0) return of([]);

        return forkJoin({
          activities: this.roadWorkActivityService.getRoadWorkActivities(),
          users: this.userService.getAllUsers()
        }).pipe(
          map(({ activities, users }) => {
            const actsBySKsNo = new Map<string, RoadWorkActivityFeature[]>();
            for (const a of activities ?? []) {
              const key = String(a?.properties?.sksNo);
              if (!actsBySKsNo.has(key)) actsBySKsNo.set(key, []);
              actsBySKsNo.get(key)!.push(a);
            }

            const basePeople: SessionChild[] = (users ?? []).map((user) => ({
              id: user.mailAddress,
              name: `${user.firstName} ${user.lastName}`,
              isRoadworkProject: false,
              department: user.organisationalUnit?.abbreviation ?? '',
              workArea: user.workArea ?? '',
              mailAddress: user.mailAddress ?? '',
              isPresent: user.isParticipantList === true,
              shouldBePresent: user.isParticipantList === true,
              isDistributionList: user.isDistributionList === true
            }));

            const matchedActivityIds = new Set<string>();

            const enriched = sessions.map(s => {
              const key = String(s?.sksNo);
              const acts = actsBySKsNo.get(key) ?? [];

              for (const act of acts) {
                const uuid = act?.properties?.uuid;
                if (uuid) matchedActivityIds.add(uuid);
              }

              const childrenProjects: SessionChild[] = acts.map(act => {
                const { type, section, name } = act.properties;

                const joinedName = [type, name, section]
                  .filter((v) => v && String(v).trim().length > 0)
                  .join('/ ');

                return {
                  id: String(act.properties.uuid),
                  name: joinedName,
                  roadWorkActivityNo: act.properties.roadWorkActivityNo,
                  isRoadworkProject: true,
                  sessionComment1: act.properties.sessionComment1,
                  sessionComment2: act.properties.sessionComment2,
                  notAssignedNeeds: [],
                  isAggloprog: act.properties.isAggloprog || false,
                  isParticip: act.properties.isParticip || false,
                  isPlanCirc: act.properties.isPlanCirc || false,
                  isTrafficRegulationRequired: act.properties.isTrafficRegulationRequired || false
                } as any;
              });

              const uniq = new Map<string, SessionChild>();
              for (const p of basePeople) {
                const k = this.normalizeEmail(p.mailAddress ?? p.id);
                if (!uniq.has(k)) uniq.set(k, p);
              }
              const allPeopleBase = Array.from(uniq.values());

              const allPeopleWithFlags = this.applyCsvFlags(
                allPeopleBase,
                s.presentUserIds,
                s.distributionUserIds
              );

              const children = [...childrenProjects, ...allPeopleWithFlags];

              return {
                ...s,
                childrenProjects,
                childrenPresent: allPeopleWithFlags,
                childrenDistribution: allPeopleWithFlags,
                children,
              };
            });

            const unmatchedActs = (activities ?? []).filter(
              a => a?.properties?.uuid && !matchedActivityIds.has(a.properties.uuid)
            );

            if (unmatchedActs.length > 0) {
              const unknownProjects: SessionChild[] = unmatchedActs.map(act => {
                const { type, section, name } = act.properties;

                const joinedName = [type, name, section]
                  .filter(v => v && String(v).trim().length > 0)
                  .join('/ ');

                return {
                  id: String(act.properties.uuid),
                  name: joinedName,
                  isRoadworkProject: true,
                  roadWorkActivityNo: act.properties.roadWorkActivityNo,
                };
              });

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
                prevSessionDate: '',
                sessionDate: '',
                nextSessionDate: '',
                plannedDate: null as any,
                sksNo: undefined as any,
                sessionCreator: '',
                acceptance1: '-',
                attachments: '-',
                miscItems: '-',
                errorMessage: '',
                location: '',
                timeWindow: '',
                chairperson: '',
                minuteTaker: '',
                childrenProjects: unknownProjects,
                childrenPresent: allPeopleUnknown,
                childrenDistribution: allPeopleUnknown,
                children: [...unknownProjects, ...allPeopleUnknown],
                presentUserIds: '',
                distributionUserIds: ''
              };

              enriched.push(unknownSession);
            }

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
        this.sessionsData = enrichedSessions ?? [];

        setTimeout(() => {
          if (!this.sessionsGrid?.api || this.sessionsData.length === 0) {
            this.isDataLoading = false;
            return;
          }

          const api = this.sessionsGrid.api;

          let restored = false;
          try {
            const raw = localStorage.getItem(LS_KEY_SELECTED_SESSION);
            if (raw) {
              const stored = JSON.parse(raw) as { sksNo?: number };
              if (stored?.sksNo != null) {
                const idx = this.sessionsData.findIndex(s => s.sksNo === stored.sksNo);
                if (idx >= 0) {
                  api.ensureIndexVisible(idx);
                  api.getDisplayedRowAtIndex(idx)?.setSelected(true);
                  restored = true;
                }
              }
            }
          } catch {
          }

          if (!restored) {
            const first = api.getDisplayedRowAtIndex(0);
            first?.setSelected(true);
          }

          this.isDataLoading = false;
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
    this.selectedSession = this.selectedNode?.data ?? null;

    if (!this.selectedNode) {
      this.projectRows = [];
      this.presentUserRows = [];
      this.distributionUserRows = [];

      this.detailsForm.reset({
        plannedDate: null,
        reportType: '',
        location: '',
        timeWindow: '',
        chairperson: '',
        minuteTaker: '',
        acceptance1: '',
        attachments: '',
        miscItems: ''
      });
      this.detailsForm.disable({ emitEvent: false });
      return;
    }

    const session: Session = this.selectedNode.data;

    if (session?.sksNo != null) {
      localStorage.setItem(
        LS_KEY_SELECTED_SESSION,
        JSON.stringify({ sksNo: session.sksNo })
      );
    }

    this.detailsForm.enable({ emitEvent: false });
    this.detailsForm.patchValue(
      {
        plannedDate: session?.plannedDate ?? null,
        reportType: session?.reportType ?? '',
        location: session?.location ?? '',
        timeWindow: session?.timeWindow ?? '',
        chairperson: session?.chairperson ?? '',
        minuteTaker: session?.minuteTaker ?? '',
        acceptance1: session?.acceptance1 ?? '',
        attachments: session?.attachments ?? '',
        miscItems: session?.miscItems ?? '',
      },
      { emitEvent: false }
    );

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

  getPresentListCount(rows: SessionChild[] = []): number {
    return rows.reduce((n, r) => n + (r.isPresent === true ? 1 : 0), 0);
  }

  getDistributionListCount(rows: SessionChild[] = []): number {
    return rows.reduce((n, r) => n + (r.isDistributionList === true ? 1 : 0), 0);
  }

  saveDetails(): void {
    const session = this.selectedNode?.data;
    if (!session || !session.id || this.detailsForm.invalid) return;

    const uiLabel = this.detailsForm.value.reportType || '';

    const patch = {
      plannedDateForBackend: this.formatDate(this.detailsForm.value.plannedDate),
      plannedDate: this.detailsForm.value.plannedDate,
      reportType: this.SESSION_TYPE_TO_DB[uiLabel] ?? null,
      location: this.detailsForm.value.location ?? '',
      timeWindow: this.detailsForm.value.timeWindow ?? '',
      chairperson: this.detailsForm.value.chairperson ?? '',
      minuteTaker: this.detailsForm.value.minuteTaker ?? '',
      attachments: this.detailsForm.value.attachments ?? '',
      acceptance1: this.detailsForm.value.acceptance1 ?? '',
      miscItems: this.detailsForm.value.miscItems ?? ''
    };

    Object.assign(session, { ...patch, reportType: uiLabel });

    this.sessionsGrid?.api?.refreshCells?.({
      rowNodes: [this.selectedNode!],
      columns: [
        'acceptance1',
        'attachments',
        'miscItems',
        'plannedDate',
        'reportType',
        'location',
        'timeWindow',
        'chairperson',
        'minuteTaker',
        'presentUserIds',
        'distributionUserIds'
      ],
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

  savePeopleAsCsv(): void {
    const session = this.selectedNode?.data;
    if (!session?.sksNo) return;

    const presentRows = this.presentUserRows ?? [];
    const distributionRows = this.distributionUserRows ?? [];

    const presentCsv = this.usersToCsvIdm(presentRows, 'isPresent');
    const distributionCsv = this.usersToCsvIdm(distributionRows, 'isDistributionList');

    session.presentUserIds = presentCsv;
    session.distributionUserIds = distributionCsv;
    this.sessionsGrid?.api?.refreshCells?.({
      rowNodes: [this.selectedNode!],
      columns: ['presentUserIds', 'distributionUserIds'],
      force: true
    });

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

  openNewSessionDialog(): void {
    const ref = this.dialog.open(NewSessionDialogComponent, {
      width: '640px',
      data: { sessions: this.sessionsData }
    });

    ref.afterClosed().subscribe(payload => {
      if (!payload) return;

      const newSksNo = payload.sksNo;
      const defaultPlannedDate = this.getDefaultPlannedDate();
      const defaultPlannedDateForBackend = this.getDefaultPlannedDateForBackend();

      this.isDataLoading = true;

      this.sessionService.createSession({
        sksNo: newSksNo,
        plannedDateForBackend: defaultPlannedDateForBackend
      })
      .pipe(finalize(() => this.isDataLoading = false))
      .subscribe({
        next: (created) => {

          const sessionRow = {
            id: this.sessionsData.length + 1,
            sksNo: newSksNo,
            reportType: 'PRE_PROTOCOL',
            sessionName: 'Sitzung ' + newSksNo,
            sessionDate: created.plannedDate?.toString() ?? defaultPlannedDate.toString(),
            plannedDate: created.plannedDate ?? defaultPlannedDate,
            sessionCreator: '',
            location: 'Stadt Winterthur, Departement Bau und Mobilität, Tiefbauamt, Superblock, Pionierstrasse 7 (Sitzungszimmer SZ Public B001 PION5)',
            timeWindow: '10:30-12:00',
            chairperson: 'Stefan Gahler, TBA APK (Leitung Planung & Koordination)',
            minuteTaker: 'Tobias Juaon / Abteilung Planung und Koordination (APK)',
            acceptance1: 'Das Protokoll wird ohne Anmerkungen verdankt.',
            attachments: 'Keine',
            miscItems: 'Keine',
            errorMessage: '',
            presentUserIds: '',
            distributionUserIds: '',
            childrenProjects: [],
            childrenPresent: [],
            childrenDistribution: [],
            children: []
          };

          this.sessionsData = [sessionRow, ...this.sessionsData];

          setTimeout(() => {
            this.sessionsGrid?.api?.setRowData(this.sessionsData);
            const idx = this.sessionsData.findIndex(r => r.sksNo === newSksNo);
            if (idx >= 0) {
              this.sessionsGrid.api.ensureIndexVisible(idx);
              this.sessionsGrid.api.getDisplayedRowAtIndex(idx)?.setSelected(true);
            }

            this.snckBar.open('Neue Sitzung wurde erstellt.', '', { duration: 2500 });
          }, 0);
        },
        error: (err) => {
          console.error('Create session failed', err);

          if (err?.status === 409) {
            this.snckBar.open(
              `SKS-Nr ${newSksNo} ist bereits vergeben.`,
              '',
              { duration: 4000 }
            );
            return;
          }

          this.snckBar.open(
            'Beim Erstellen der Sitzung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
            '',
            { duration: 4000 }
          );
        }
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
    return this.formatDate(withDate[idx - 1].plannedDate);
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

    return this.formatDate(withDate[idx + 1].plannedDate);
  }

  // ----------------------------- DOCX download -------------------------------

  async downloadWord(children: SessionChild[], reportType: string, session: any) {

    const intro = await this.docxWordService.makeIntroBlock.call(this.docxWordService, {
      logoUrl: "assets/win_logo.png",
      addressLines: [
        'Stadt Winterthur',
        '*Tiefbauamt*',
        'Pionierstrasse 7',
        '8403 Winterthur',
        ''
      ],
      title: TITLE_PROTOCOL_NAME + ' - ' + reportType,
      logoWidthPx: 140,
    });

    const projectInfo = [
      {
        key: 'Datum und Zeit',
        value: `${String(session.plannedDate)} / ${session.timeWindow || ''}`
      },
      {
        key: 'Ort',
        value: session.location || ''
      },
      {
        key: 'Vorsitz',
        value: session.chairperson || ''
      },
      {
        key: 'Protokoll',
        value: session.minuteTaker || ''
      },
      {
        key: 'SKS-Nr',
        value: String(session.sksNo)
      },
    ];

    const tableInfo         = this.docxWordService.makeInfoTable(projectInfo);
    const listExcused       = this.docxWordService.makeExcusedPersonsList(children);
    const listPresent       = this.docxWordService.makePresentPersonsList(children);
    const listDistribution  = this.docxWordService.makeDistributionPersonsList(children);

    const t1 = this.docxWordService.pBold('Anwesende');
    const t2 = this.docxWordService.pBold('Entschuldigt');
    const t3 = this.docxWordService.pBold('Verteiler');

    const pageBreak = this.docxWordService.pageBreak();

    const gap = this.docxWordService.spacer();
    const smallGap = this.docxWordService.smallGap();

    const agendaSection = this.docxWordService.makeAgendaAndAttachmentsSection({
      prevSessionDate: session.prevSessionDate,
      attachments: session.attachments,
      isPreProtocol: session.isPreProtocol
    });

    const protocolSection = this.docxWordService.makeProtocolSections({
      lastSksDate: session.prevSessionDate,
      sksDate: session.plannedDate,
      nextSksDate: session.nextSessionDate,
      acceptanceText: session.acceptance1 || '',
      reportType: reportType,
      isPreProtocol: session.isPreProtocol,
    });

    const activities = await this.docxWordService.prepareRoadWorkActivity(this.projectRows);
    const allProjectBlocks: Array<Paragraph | Table> = [];

    activities.sort((a, b) =>
      a.project.roadWorkActivityNo.localeCompare(b.project.roadWorkActivityNo)
    );

    for (const activity of activities) {
      allProjectBlocks.push(
        this.docxWordService.makeFullWidthTitle(
          `Bauvorhaben:`,
          { bgColor: "E0E0E0", sizeHalfPt: 24, pageBreakBefore:true }
        )
      );
      allProjectBlocks.push(
        this.docxWordService.makeFullWidthTitle(
          `${activity.project.roadWorkActivityNo ?? ''}/ ${activity.project.name ?? ''} `,
          { bgColor: "E0E0E0", sizeHalfPt: 24, pageBreakBefore: false }
        )
      );

      const imageRun = await this.docxWordService.imageFromUrlFitted(activity.mapUrl, 680);
      if (imageRun) {
        allProjectBlocks.push(new Paragraph({ alignment: AlignmentType.LEFT, children: [imageRun] }));
      }

      allProjectBlocks.push(...this.docxWordService.makeProjectMetaBlock(activity.meta));

      const assignedNeedsRowsSorted =
        activity.assignedNeedsRows.sort((a, b) =>
          a.ausloesend.localeCompare(b.ausloesend)
        );

      allProjectBlocks.push(
        this.docxWordService.smallGap(),
        this.docxWordService.pBold('Zugewiesene (berücksichtigte) Bedarfe'),
        this.docxWordService.makeNeedsTableFromRows(assignedNeedsRowsSorted)
      );

      allProjectBlocks.push(this.docxWordService.smallGap());
      allProjectBlocks.push(this.docxWordService.pBold('Aspekte/Faktoren'));
      allProjectBlocks.push(this.docxWordService.p("Folgende Aspekte und/oder Faktoren können das Bauvorhaben beeinflussen:"));
      const rows = [
        { label: "Ist im Aggloprogramm", value: activity.project.isAggloprog ? 'X' : 'Keine' },
        { label: "Mitwirkungsverfahren gemäss § 13", value: activity.project.isParticip ? 'X' : 'Keine' },
        { label: "Planauflage gemäss § 16", value: activity.project.isPlanCirc ? 'X' : 'Keine'},
        { label: "Verkehrsanordnung ist notwendig", value: activity.project.isTrafficRegulationRequired ? 'X' : 'Keine'},
      ];

      const selected = rows.filter(r => r.value.toUpperCase() === "X");

      if (selected.length === 0) {
        allProjectBlocks.push(
          this.docxWordService.p("Keine")
        );
      } else {
        for (const r of selected) {
          allProjectBlocks.push(
            this.docxWordService.p(`[ ${r.value} ] : ${r.label}`)
          );
        }
      }

      allProjectBlocks.push(this.docxWordService.smallGap());

      allProjectBlocks.push(this.docxWordService.pBold('Vernehmlassung'));

      allProjectBlocks.push(this.docxWordService.smallGap());
      allProjectBlocks.push(this.docxWordService.pBold('Bedarfsklärung - 1.Iteration'));
      const consultationSection1 = await this.docxWordService.makeConsultationInputsSection({
        uuid: activity.project.id,
        feedbackPhase: "inconsult1",
        isPhaseReporting: false
      });
      allProjectBlocks.push(...consultationSection1);

      allProjectBlocks.push(this.docxWordService.smallGap());
      allProjectBlocks.push(this.docxWordService.pBold('Bedarfsklärung - 2.Iteration'));
      const consultationSection2 = await this.docxWordService.makeConsultationInputsSection({
        uuid: activity.project.id,
        feedbackPhase: "inconsult2",
        isPhaseReporting: false,
      });
      allProjectBlocks.push(...consultationSection2);

      allProjectBlocks.push(this.docxWordService.smallGap());
      allProjectBlocks.push(this.docxWordService.pBold('Stellungnahme'));
      const consultationSection3 = await this.docxWordService.makeConsultationInputsSection({
        uuid: activity.project.id,
        feedbackPhase: "reporting",
        isPhaseReporting: true,
      });
      allProjectBlocks.push(...consultationSection3);

      allProjectBlocks.push(this.docxWordService.smallGap());
      allProjectBlocks.push(this.docxWordService.pBold(session.isPreProtocol ? 'Vorgehensvorschlag' : 'Vorgehen'));
      allProjectBlocks.push(this.docxWordService.pPreserveLines(activity.project.sessionComment1));

      allProjectBlocks.push(this.docxWordService.smallGap());
      allProjectBlocks.push(this.docxWordService.pBold('Nicht zugewiesene Bedarfe in Vorhabenfläche'));
      if (activity.notAssignedNeedsRows.length > 0) {
        allProjectBlocks.push(this.docxWordService.makeNeedsTableFromRows(activity.notAssignedNeedsRows));
      } else {
        allProjectBlocks.push(this.docxWordService.p('Keine.'));
      }
      allProjectBlocks.push(this.docxWordService.spacer());

      allProjectBlocks.push(this.docxWordService.smallGap());
      allProjectBlocks.push(this.docxWordService.pBold(`Beschluss:`));
      allProjectBlocks.push(this.docxWordService.pPreserveLines(activity.project.sessionComment2));
    }

    const miscItemsSection = this.docxWordService.makeMiscItemsSection({miscItems: session.miscItems});

    const nextSessionSection = this.docxWordService.makeNextSessionSection({
      nextSKSDate: session.nextSessionDate,
      nextOKSDate: this.nextSessionDateOKS || '-',
      nextKAPDate:  this.nextSessionDateKAP || '-',
      reportWriter: session.minuteTaker || '-',
    });

    const separator = new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, color: 'CCCCCC', size: 6 } },
      spacing: { before: 60, after: 120 },
    });

    let mailAddress = this.userService.getLocalUser().mailAddress;
    const blob = await this.docxWordService.build({
      username: mailAddress,
      orientation: 'portrait',
      marginsCm: { top: 2, right: 1, bottom: 2, left: 2 },
      isPreProtocol: session.isPreProtocol,
      children: [
        ...intro,
        separator,
        gap,
        tableInfo, gap,
        t1, ...listPresent, gap,
        t2, ...listExcused, gap,
        pageBreak,
        t3, ...listDistribution, gap,
        ...agendaSection,
        gap,
        ...protocolSection,
        ...allProjectBlocks,
        ...miscItemsSection,
        ...nextSessionSection
      ],
    });

    saveAs(blob, TITLE_PROTOCOL_NAME + ' - ' + reportType + '.docx');
  }

  formatDate(dateInput: string | Date): string {
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  onProjectSelectionChanged(): void {
    const nodes = this.projectGrid?.api?.getSelectedNodes?.() ?? [];
    const node = nodes[0] ?? null;
    const project: SessionChild | undefined = node?.data;

    const currentSession: Session | null = this.selectedNode?.data ?? null;
    if (!project || !currentSession?.sksNo) return;

    localStorage.setItem(
      LS_KEY_SELECTED_PROJECT,
      JSON.stringify({
        sksNo: currentSession.sksNo,
        projectId: project.id,
      })
    );
  }

  onProjectFirstDataRendered(event: FirstDataRenderedEvent): void {
    if (!this.projectGrid?.api || !this.projectRows || this.projectRows.length === 0) {
      return;
    }

    const currentSession: Session | null = this.selectedNode?.data ?? null;
    if (!currentSession?.sksNo) {
      return;
    }

    try {
      const raw = localStorage.getItem(LS_KEY_SELECTED_PROJECT);
      if (!raw) return;

      const stored = JSON.parse(raw) as { sksNo?: number; projectId?: string };

      if (stored.sksNo !== currentSession.sksNo || !stored.projectId) {
        return;
      }

      const api = this.projectGrid.api;

      api.forEachNode(node => {
        if (node.data?.id === stored.projectId) {
          node.setSelected(true);
        }
      });
    } catch {
    }
  }

  private getDefaultPlannedDate(daysToAdd = 30): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysToAdd);
    return d;
  }

  private getDefaultPlannedDateForBackend(daysToAdd = 30): string {
    return this.formatDate(this.getDefaultPlannedDate(daysToAdd));
  }
}