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
import html2pdf from 'html2pdf.js';
import {
  GridApi,
  ColumnApi,
  GridReadyEvent,
  ColDef,
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

  /** Master grid data: list of sessions. */
  sessionsData: Session[] = [];

  /** Currently selected session's children to show in the child grid. */
  selectedChildren: SessionChild[] = [];

  /**
   * Email hints from environment:
   * - `presentEmails`: if a user's email starts with any of these prefixes, they are marked present.
   * - `distributionListEmails`: analogous for the distribution list.
   */
  presentEmails: string[] = environment.presentEmails ?? [];
  distributionListEmails: string[] = environment.distributionListEmails ?? [];

  /** Values offered in the report type combo box. */
  reportTypeOptions: ReportType[] = ['Vor-Protokol SKS', 'Protokol SKS'];

  /** Master grid columns (Community only). */
  columnDefs: ColDef[] = [
    { headerName: 'Phase/Status', field: 'sessionName', minWidth: 220 },
    { headerName: 'Datum Genehmigung', field: 'sessionDateApproval' },
    {
      headerName: 'Berichtsstatus',
      field: 'sessionType',
      editable: true,
      singleClickEdit: true,
      cellEditor: 'agSelectCellEditor', // Community
      cellEditorParams: {
        values: this.reportTypeOptions, // string[]
      },      
      filter: 'agTextColumnFilter',
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
        button.addEventListener('click', () =>
          this.generateSessionPDF(
            params.data.id,
            params.data.sessionType,
            params.data.sessionDateApproval,
            params.data.children
          )
        );
        return button;
      },
    },
    {
      /**
       * Hidden utility column to support quick filtering across multiple fields,
       * including flattened child data. Works in Community.
       */
      headerName: 'BV (quick only)',
      colId: 'bvQuick',
      hide: true,
      filter: false,
      valueGetter: p => {
        const d = p.data ?? {};
        const childText = (d.children ?? [])
          .map((c: any) => c?.bv ?? c?.name ?? '')
          .filter(Boolean)
          .join(' ');
        return [
          d.sessionType,
          d.sessionName,
          d.sessionDateApproval,
          d.sessionCreator,
          d.sessionDate,
          childText,
        ]
          .filter(Boolean)
          .join(' ');
      },
      getQuickFilterText: p => String(p.value ?? ''),
    },
  ];

  /** Default column settings for the master grid. */
  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 200,
    sortable: true,
    resizable: true,
    filter: 'agTextColumnFilter',
    menuTabs: ['filterMenuTab'] as ColumnMenuTab[],
  };

  /** Child grid column defs (Community). */
  childColumnDefs: ColDef[] = [];
  childDefaultColDef: ColDef = {
    flex: 1,
    minWidth: 140,
    sortable: true,
    resizable: true,
    filter: 'agTextColumnFilter',
    menuTabs: ['filterMenuTab'] as ColumnMenuTab[],
  };

  /** Current user (loaded on init). */
  user: User = new User();
  userService: UserService;

  /** Optional cache of activities (not directly bound in the grid). */
  roadWorkActivity: RoadWorkActivityFeature[] | undefined;

  /** Services and UI. */
  private roadWorkActivityService: RoadWorkActivityService;
  private reportLoaderService: ReportLoaderService;
  private snckBar: MatSnackBar;

  /** German locale overrides for AG Grid UI strings. */
  localeText = AG_GRID_LOCALE_DE;

  /** View children */
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;
  @ViewChild('reportContainer', { static: false }) reportContainer!: ElementRef;

  constructor(
    roadWorkActivityService: RoadWorkActivityService,
    reportLoaderService: ReportLoaderService,
    userService: UserService,
    snckBar: MatSnackBar
  ) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.snckBar = snckBar;
    this.isDataLoading = true;
    this.reportLoaderService = reportLoaderService;

    // Build child grid columns (Community-safe)
    const iconRenderer = (p: any) => {
      const e = document.createElement('span');
      e.classList.add('material-icons', 'small-icon');
      e.textContent = !p.data?.isRoadworkProject ? 'person' : 'work';
      e.title = !p.data?.isRoadworkProject ? 'Person' : 'Bauvorhaben';
      if (p.data?.isRoadworkProject) e.classList.add('icon-project');
      return e;
    };

    const makeCheckboxRenderer = (field: 'isPresent' | 'isDistributionList') => {
      return (params: any) => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!params.value;
        // Disable for projects and while loading
        input.disabled = !!params.data?.isRoadworkProject || this.isDataLoading;
        input.addEventListener('change', () => {
          // Community-friendly update without enterprise editors
          params.node.setDataValue(field, input.checked);
        });
        return input;
      };
    };

    this.childColumnDefs = [
      {
        headerName: '',
        colId: 'typeIcon',
        width: 60,
        pinned: 'left',
        suppressMenu: true,
        sortable: false,
        resizable: false,
        cellClass: 'type-icon-cell',
        cellRenderer: iconRenderer,
      },
      { headerName: 'Id', field: 'id', width: 110 },
      { headerName: 'Name', field: 'name', minWidth: 200 },
      { headerName: 'Werk', field: 'department' },
      { headerName: 'E-Mail', field: 'mailAddress' },
      {
        headerName: 'Anwesend',
        field: 'isPresent',
        cellRenderer: makeCheckboxRenderer('isPresent'),
        width: 140,
      },
      {
        headerName: 'Verteiler',
        field: 'isDistributionList',
        cellRenderer: makeCheckboxRenderer('isDistributionList'),
        width: 140,
      },
    ];
  }

  /**
   * Initialization: load current user + sessions and augment with user rows.
   */
  ngOnInit(): void {
    this.userService
      .getUserFromDB(this.userService.getLocalUser().mailAddress)
      .subscribe({
        next: (users) => {
          if (users && users.length > 0 && users[0]) {
            let user: User = users[0];
            ErrorMessageEvaluation._evaluateErrorMessage(user);
            if (user && user.errorMessage && user.errorMessage.trim().length !== 0) {
              this.snckBar.open(user.errorMessage, '', {
                duration: 4000,
              });
            } else {
              this.user = user;
            }
          }
          this.isDataLoading = false;
        },
        error: () => {
          this.snckBar.open(
            'Beim Laden von Benutzerdaten ist ein Systemfehler aufgetreten. Bitte wenden Sie sich an den Administrator.',
            '',
            {
              duration: 4000,
            }
          );
          this.isDataLoading = false;
        },
      });

    const presentSet = new Set(
      this.presentEmails.map((e: string) => e.toLowerCase().trim())
    );
    const distributionListSet = new Set(
      this.distributionListEmails.map((e: string) => e.toLowerCase().trim())
    );

    const sessionsWithUsers$ = this.roadWorkActivityService.getRoadWorkActivities().pipe(
      map((activities: RoadWorkActivityFeature[]) => this.transformToSessions(activities)),
      switchMap((sessions: Session[]) =>
        this.userService.getAllUsers().pipe(
          map((users) => {
            const mapped: SessionChild[] = users.map((user) => {
              const email = (user.mailAddress ?? '').toLowerCase().trim();
              const isPresent =
                email !== '' && [...presentSet].some((p) => email.startsWith(p));
              const isDistributionList =
                email !== '' && [...distributionListSet].some((p) => email.startsWith(p));

              return {
                id: '',
                name: `${user.firstName} ${user.lastName}`,
                isRoadworkProject: false,
                department: user.organisationalUnit?.abbreviation ?? '',
                mailAddress: user.mailAddress ?? '',
                isPresent,
                shouldBePresent: isPresent,
                isDistributionList,
                shouldBeOnDistributionList: isDistributionList,
              };
            });

            const filtered = mapped.filter(
              (u) => u.shouldBePresent || u.shouldBeOnDistributionList
            );

            const userChildren: SessionChild[] = filtered.map((u, idx) => ({
              ...u,
              id: String(idx + 1),
            }));

            return sessions.map((session) => ({
              ...session,
              children: [...session.children, ...userChildren],
            }));
          })
        )
      )
    );

    sessionsWithUsers$.subscribe({
      next: (sessions) => {
        this.sessionsData = sessions;
        // Reset child grid when data reloads
        this.selectedChildren = [];
      },
      error: console.error,
    });
  }

  /** AG Grid callback: capture APIs for later operations. */
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.columnApi = params.columnApi;
  }

  /** Apply quick filter text from an input element to the grid. */
  onQuickFilterChanged() {
    const value =
      (document.querySelector<HTMLInputElement>('#input-quick-filter')?.value ||
        '').trim();
    this.gridApi?.setQuickFilter(value);
  }

  /** When a session is selected, populate the child grid below. */
  onSelectionChanged() {
    const sel = this.gridApi?.getSelectedRows?.() || [];
    const row: Session | undefined = sel[0];
    this.selectedChildren = row?.children ?? [];
  }

  /**
   * Generate a Word document and a PDF for the provided session.
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

      this.reportContainer.nativeElement.innerHTML = html;
      const target =
        this.reportContainer.nativeElement.firstElementChild as HTMLElement;

      if (!target || target.offsetWidth === 0 || target.offsetHeight === 0) {
        return;
      }

      // Word
      this.snckBar.open(
        'Word-Dokument wird generiert...' +
          String(sessionType) +
          ' - ' +
          String(sessionDateApproval),
        '',
        {
          duration: 4000,
        }
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

      const blobOrBuffer = await asBlob(htmlWord, {
        orientation: 'portrait' as const,
        margins,
      });

      const docxMime =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const docxBlob =
        blobOrBuffer instanceof Blob
          ? blobOrBuffer
          : new Blob([blobOrBuffer as unknown as ArrayBuffer], {
              type: docxMime,
            });

      saveAs(docxBlob, `${filenameBase}.docx`);

      // PDF
      this.snckBar.open(
        'PDF wird generiert...' +
          String(sessionType) +
          ' - ' +
          String(sessionDateApproval),
        '',
        {
          duration: 4000,
        }
      );
      await html2pdf()
        .from(target)
        .set({
          filename: 'Strategische Koordinationssitzung (SKS)' + '-' + sessionType + '.pdf',
          margin: [10, 10, 16, 10],
          html2canvas: {
            scale: 2,
            useCORS: true,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: {
            mode: ['css', 'legacy'],
            avoid: ['.no-split'],
          },
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
      this.snckBar.open('Fehler beim Generieren des Berichts.', '', {
        duration: 4000,
      });
    } finally {
      this.isDataLoading = false;
    }
  }

  /**
   * Transform activities into grouped sessions by dateSksPlanned (ISO).
   */
  transformToSessions(activities: RoadWorkActivityFeature[]): Session[] {
    const groups = new Map<string, RoadWorkActivityFeature[]>();

    for (const act of activities) {
      const dateKey = act.properties.dateSksPlanned?.toString() ?? 'unknown';
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(act);
    }

    const knownDateKeys = [...groups.keys()].filter((k) => k !== 'unknown').sort();
    const dateKeys = [...knownDateKeys, ...(groups.has('unknown') ? ['unknown'] : [])];

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

      sessions.push({
        id: first.properties.uuid,
        sessionType: 'Vor-Protokol SKS',
        sessionName,
        sessionDateApproval: dateKey.split('T')[0], // YYYY-MM-DD
        sessionCreator: first.properties.areaManager?.firstName ?? '',
        sessionDate: first.properties.created.toString() ?? '',
        children: acts.map((act) => ({
          id: act.properties.uuid,
          name: `${act.properties.type} / ${act.properties.section || act.properties.name}`,
          isRoadworkProject: true,
        })),
      });
    }

    return sessions;
  }
}
