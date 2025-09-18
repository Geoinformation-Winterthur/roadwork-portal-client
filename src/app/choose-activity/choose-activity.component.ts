/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 *
 * @file ChooseActivityComponent
 * @description Angular component that lists and filters "road work activities" in an AG Grid table.
 * It loads activities, enriches them with area-management metadata, and provides helper methods
 * for due-date coloring, quarter calculation, and unique manager lists. All comments added without
 * modifying any executable code.
 */
import { Component, OnInit, ViewChild } from '@angular/core';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkActivityFeature } from '../../model/road-work-activity-feature';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from 'src/services/user.service';
import { User } from 'src/model/user';
import { ManagementAreaService } from 'src/services/management-area.service';
import { FormControl } from '@angular/forms';
import { ColDef } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';
import { AG_GRID_LOCALE_DE } from 'src/helper/locale.de';


@Component({
  selector: 'app-choose-activity',
  templateUrl: './choose-activity.component.html',
  styleUrls: ['./choose-activity.component.css']
})
export class ChooseActivityComponent implements OnInit {

  /** Flag to show loading indicators while async data is being fetched. */
  isDataLoading: boolean = false;

  /** Full data set of activity features fetched from the backend. */
  roadWorkActivityFeatures: RoadWorkActivityFeature[] = [];
  /** Optional filtered subset used by the grid (currently not utilized). */
  roadWorkActivityFeaturesFiltered: RoadWorkActivityFeature[] = [];

  /** Controls visibility of the filter panel (if present in template). */
  filterPanelOpen: boolean = false;

  /** Free-text filter: activity name. */
  chosenActivityName: string = "";
  /** Optional filter for "from year" constraint. */
  chosenActivityYearFrom?: number;
  /** Toggle to restrict to "my activities". */
  filterMyActivities?: boolean = false;
  /** Optional filter for a due date. */
  filterDueDate?: Date;
  /** Optional filter for planned start of construction. */
  filterStartOfConstruction?: Date;
  /** Optional filter for SKS evaluation value. */
  filterEvaluationSks?: number;
  /** Dropdown control for filtering by area manager. */
  filterAreaManagerControl: FormControl = new FormControl();
  /** Dropdown control for filtering by project manager. */
  filterProjectManagerControl: FormControl = new FormControl();

  /**
   * Status codes used to filter activities. The codes map to human-readable labels
   * in the grid column definition below.
   */
  statusFilterCodes: string[] = ["review", "inconsult1", "inconsult2", "verified1", "verified2", "reporting", "coordinated", "prestudy"];

  /** Column keys to show (kept for reference if using Angular Material tables). */
  tableDisplayedColumns: string[] = ['status', 'area_man', 'title', 'involved', 'lead', 'project_man',
    'realisation_date', 'due_date', 'link_cityplan', 'link_wwg'];

  /** Currently logged-in user (loaded in ngOnInit). */
  user: User = new User();
  /** Reference to the user service (DI). */
  userService: UserService;

  /** Injected services used within this component. */
  private roadWorkActivityService: RoadWorkActivityService;
  private managementAreaService: ManagementAreaService;
  private snckBar: MatSnackBar;

  /** AG Grid locale strings (German). */
  localeText = AG_GRID_LOCALE_DE;

  /**
   * Default column definition applied to all AG Grid columns unless overridden.
   * - sortable/resizable for UX
   * - text filter by default
   * - only the filter menu tab is shown
   */
  defaultColDef: ColDef = {
    sortable: true,    
    resizable: true,    
    filter: 'agTextColumnFilter', 
    menuTabs: ['filterMenuTab'],
  };

  /**
   * Column definitions for the activity list. Individual columns use valueGetters
   * and cellRenderers to map nested properties and render chips/links.
   */
  columnDefs: ColDef[] = [
    // --- Status column: maps internal status codes to labeled colored badges.
    {
      headerName: 'Status',
      field: 'statusLabel',
      sortable: true,
      filter: 'agSetColumnFilter',  
      valueGetter: ({ data }) => {
        const status = data?.properties?.status;
        const labelMap: Record<string, string> = {
          requirement: '11/Bedarf',
          review: '12/Prüfung',
          verified1: '12/verifiziert-1',
          verified2: '12/verifiziert-2',
          inconsult1: '12/Bedarfsklärung - 1.Iteration',
          inconsult2: '12/Bedarfsklärung - 2.Iteration',
          reporting: '12/Stellungnahme',
          coordinated: '12/koordiniert',
          prestudy: '21/Vorstudie',
          suspended: 'sistiert'
        };
        return labelMap[status] ?? status ?? '';
      },  
      cellRenderer: ({ data }: any) => {
        const status = data?.properties?.status;
        const map: Record<string, { label: string; color: string }> = {
          requirement: { label: '11/Bedarf', color: '#b3e5fc' },
          review: { label: '12/Prüfung', color: '#90caf9' },
          verified1: { label: '12/verifiziert-1', color: '#64b5f6' },
          verified2: { label: '12/verifiziert-2', color: '#64b5f6' },
          inconsult1: { label: '12/Bedarfsklärung - 1.Iteration', color: '#4fc3f7' },
          inconsult2: { label: '12/Bedarfsklärung - 2.Iteration', color: '#4fc3f7' },
          reporting: { label: '12/Stellungnahme', color: '#29b6f6' },
          coordinated: { label: '12/koordiniert', color: '#0288d1' },
          prestudy: { label: '21/Vorstudie', color: '#81c784' },
          suspended: { label: 'sistiert', color: '#e0e0e0' }
        };

        const entry = map[status];
        if (!entry) return status ?? '';

        return `
          <span style="
            background-color: ${entry.color};
            color: black;
            padding: 3px 5px;
            border-radius: 10px;
            font-size: 0.8rem;
            font-weight: 500;
            display: inline-block;
            white-space: nowrap;
            line-height: 1.5;
          ">
            ${entry.label}
          </span>
        `;
      }
    }
    ,
    // --- Area Manager (GM): shows first and last name or blank.
    {
      headerName: 'GM',
      valueGetter: ({ data }) => {
        const m = data?.properties?.areaManager;
        return m ? `${m.firstName} ${m.lastName}` : '';
      },
      cellRenderer: ({ value }: any) => value || '–',
      sortable: true,
      filter: true
    },
    // --- Title/Name column: renders a link to the activity details; tooltip includes section.
    {
      headerName: 'Bezeichnung',
      minWidth: 400, 
      valueGetter: ({ data }) => data?.properties?.name || '',
      cellRenderer: ({ data }: any) => {
        const name = data?.properties?.name ?? '';
        const section = data?.properties?.section ?? '';
        const uuid = data?.properties?.uuid ?? '';
        const tooltip = `${name} ${section}`;
        return `
          <a href="/civil-engineering/roadworks-portal/activities/${uuid}" title="${tooltip}" style="
            display: inline-block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            max-width: 100%;
          ">
            ${name}
          </a>`;
      },
      sortable: true,
      filter: true
    },
    // --- Involved organizations: flattens involvedUsers to a comma-separated org abbreviation list.
    {
      headerName: 'Mitwirkende',
      field: 'properties', 
      minWidth: 150,
      maxWidth: 300,
      valueGetter: ({ data }) => {
        if (typeof this.getInvolvedOrgsNames === 'function') {
          return this.getInvolvedOrgsNames(data).join(', ');
        }
        return '';
      },
      cellRenderer: ({ value }: any) => {
        return `
          <div title="${value}" style="
            display: inline-block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            width: 100%;
          ">
            ${value}
          </div>`;
      },
      sortable: true,
      filter: true
    },
    // --- Lead of realization: shows the activity kind (domain-specific label).
    {
      headerName: 'Lead Realisierung',
      valueGetter: ({ data }) => data?.properties?.kind?.name ?? '',
      sortable: true,
      filter: true
    },
    // --- Project Manager (PL): user full name or blank.
    {
      headerName: 'PL',
      valueGetter: ({ data }) => {
        const m = data?.properties?.projectManager;
        return m ? `${m.firstName} ${m.lastName}` : '';
      },
      sortable: true,
      filter: true
    },
    // --- Planned realization time: rendered as quarter and year (e.g., "2.Q 2026").
    {
      headerName: 'Voraussichtliche Realisierung',
      width:230,
      valueGetter: ({ data }) => {
        const raw = data?.properties?.startOfConstruction;
        if (!raw) return '';
        const date = new Date(raw);
        const q = Math.floor(date.getMonth() / 3) + 1;
        return `${q}.Q ${date.getFullYear()}`;
      },
      sortable: true,
      filter: true
    },
   // --- Due date: displays a mat-chip with color based on urgency and supports date filtering.
   {
      headerName: 'Fälligkeit',
      width: 130,
      valueGetter: ({ data }) => {
        return this.calcDueDate(data) || null; 
      },
      cellRenderer: ({ value, data }: any) => {
        const style = this.getColorDueDate(data);
        const text = value ? new Date(value).toLocaleDateString('de-CH') : 'nicht bestimmt';
        return `<mat-chip style="${style}">${text}</mat-chip>`;
      },
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: ({ value }) => {
        return value instanceof Date ? value.toLocaleDateString('de-CH') : '';
      },
      filterParams: {
        comparator: (filterDate: Date, cellValue: Date) => {
          if (!(cellValue instanceof Date)) return -1;
          const cell = new Date(cellValue.getFullYear(), cellValue.getMonth(), cellValue.getDate());
          const filter = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());

          return cell < filter ? -1 : cell > filter ? 1 : 0;
        },
        browserDatePicker: true,
        buttons: ['reset', 'apply'],
        closeOnApply: true
      }
    },
    // --- Stadtplan link: builds an external URL using first coordinate pair if available.
    {
      headerName: 'Stadtplan-Link',
      sortable: false,
      filter: false,
      maxWidth: 150,
      cellRenderer: ({ data }: any) => {
        const x = data?.geometry?.coordinates?.[0]?.x;
        const y = data?.geometry?.coordinates?.[0]?.y;
        if (!x || !y) return '';
        const href = `https://stadtplan.winterthur.ch?topic=Grundkarte&scale=1000&x=${x}&y=${y}&back=Hintergrundkarte_LK_AV_Situationsplan`;
        return `<a href="${href}" target="_blank">Im Stadtplan</a>`;
      }
    },
    // --- WinWebGIS link: intranet URL using the same coordinate heuristic.
    {
      headerName: 'WinWebGIS-Link',
      sortable: false,
      filter: false,
      maxWidth: 160,
      cellRenderer: ({ data }: any) => {
        const x = data?.geometry?.coordinates?.[0]?.x;
        const y = data?.geometry?.coordinates?.[0]?.y;
        if (!x || !y) return '';
        const href = `http://intramap.winport.net/projekte/tiefbau_info/start_redirect_wikis.php?&x=${x}&y=${y}`;
        return `<a href="${href}" target="_blank" style="margin:1em;">Im WinWebGIS</a>`;
      }
    }
  ];


  /** AG Grid instance reference for manual refresh calls. */
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  /**
   * Constructor with Angular DI for required services.
   * - roadWorkActivityService: loads activities
   * - userService: resolves current user and DB user data
   * - managementAreaService: enriches each activity with area manager info
   * - snckBar: shows transient error/info messages
   */
  constructor(roadWorkActivityService: RoadWorkActivityService,
    userService: UserService, managementAreaService: ManagementAreaService,
    snckBar: MatSnackBar) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.managementAreaService = managementAreaService;
    this.snckBar = snckBar;
    this.isDataLoading = true;
  }

  /**
   * Lifecycle hook: initializes component state by loading activities and the current user.
   * Displays a snack bar on user-related system errors. Activity loading continues
   * independently (see getAllActivities).
   */
  ngOnInit(): void {
    this.getAllActivities();

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
        },
        error: (error) => {
          this.snckBar.open("Beim Laden von Benutzerdaten ist ein Systemfehler aufgetreten. Bitte wenden Sie sich an den Administrator.", "", {
            duration: 4000
          });
        }
      });
  }

  /**
   * Loads all road work activities, converts their geometry to a RoadworkPolygon instance,
   * requests the intersecting management area for each, and attaches the area's manager to the activity.
   * After data is prepared, forces an AG Grid refresh (with a timeout) and hides the loading indicator.
   *
   * Note: The 3-second timeout ensures grid cells are refreshed after async enrichment completes.
   */
  getAllActivities() {

    this.roadWorkActivityService.getRoadWorkActivities().subscribe({
      next: (roadWorkActivities) => {

        for (let roadWorkActivity of roadWorkActivities) {
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = roadWorkActivity.geometry.coordinates;
          roadWorkActivity.geometry = blowUpPoly;
          this.managementAreaService.getIntersectingManagementArea(roadWorkActivity.geometry)
            .subscribe({
              next: (managementArea) => {
                if (roadWorkActivity && managementArea) {
                  roadWorkActivity.properties.areaManager = managementArea.manager;
                  roadWorkActivity.properties.evaluation = 0;
                  roadWorkActivity.properties.evaluationSks = 0;
                }
              },
              error: (error) => {
              }
            });
        }

        this.roadWorkActivityFeatures = roadWorkActivities;
        setTimeout(() => {
            if (this.agGrid?.api?.refreshCells) {
              this.agGrid.api.refreshCells({ force: true });
              this.isDataLoading = false;
            }
          }, 3000);

        //this.filterActivities();
      },
      error: (error) => {
         this.isDataLoading = false;
      }
    });

  }

  /**
   * Placeholder for client-side filtering logic.
   * The original detailed filter implementation is commented out below and retained
   * for reference. Currently returns `true` to keep API compatibility.
   */
  filterActivities() {

  /*  if (this.statusFilterCodes.includes("all")) {
      let chooseAll = [];
      chooseAll.push('all');
      chooseAll.push('review');
      chooseAll.push('inconsult1');
      chooseAll.push('inconsult2');
      chooseAll.push('verified2');
      chooseAll.push('verified2');
      chooseAll.push('reporting');
      chooseAll.push('coordinated');
      chooseAll.push('suspended');
      chooseAll.push('prestudy');
      this.statusFilterCodes = chooseAll;
    } else if (this.statusFilterCodes.length == 7) {
      this.statusFilterCodes = [];
    }

    this.roadWorkActivityFeaturesFiltered =
      this.roadWorkActivityFeatures
        .filter(roadWorkActivity => {

          let showActivity = true;

          if (showActivity && roadWorkActivity && roadWorkActivity.properties) {

            if (roadWorkActivity.properties.name) {
              let activityName: string = roadWorkActivity.properties.name.trim().toLowerCase();
              let filterActivityName: string = this.chosenActivityName.trim().toLowerCase();
              if (filterActivityName && activityName) {
                showActivity = activityName.includes(filterActivityName);
              }
            }

            if (showActivity && roadWorkActivity.properties.finishEarlyTo) {
              let finishEarlyTo: Date = new Date(roadWorkActivity.properties.finishEarlyTo);
              if (this.chosenActivityYearFrom) {
                showActivity = finishEarlyTo.getFullYear() === this.chosenActivityYearFrom;
              }
            }

            if (showActivity && roadWorkActivity.properties.status) {
              if (this.statusFilterCodes) {
                showActivity = this.statusFilterCodes.includes(roadWorkActivity.properties.status);
              }
            }

            if (showActivity && this.filterStartOfConstruction && roadWorkActivity.properties.startOfConstruction !== undefined) {
              let startOfConstruction: Date = new Date(roadWorkActivity.properties.startOfConstruction);
              startOfConstruction.setHours(0, 0, 0, 0);

              let filterStartOfConstruction: Date = new Date(this.filterStartOfConstruction);
              filterStartOfConstruction.setHours(0, 0, 0, 0);

              showActivity = filterStartOfConstruction.valueOf() === startOfConstruction.valueOf();
             
            }

            if (showActivity && this.filterEvaluationSks && roadWorkActivity.properties.evaluationSks !== undefined) {
              showActivity = this.filterEvaluationSks === roadWorkActivity.properties.evaluationSks;
            }

            if (showActivity && this.filterDueDate) {
              let dueDate = this.calcDueDate(roadWorkActivity)
              if (dueDate) {
                dueDate.setHours(0, 0, 0, 0);

                let filterDueDate: Date = new Date(this.filterDueDate);
                filterDueDate.setHours(0, 0, 0, 0);

                showActivity = filterDueDate.valueOf() === dueDate.valueOf();
              }
            }

            let filterAreaManager: User | undefined;
            if (showActivity && this.filterAreaManagerControl.value)
              filterAreaManager = this.filterAreaManagerControl.value as User;
            if (filterAreaManager && roadWorkActivity.properties.areaManager) {
              showActivity = filterAreaManager.uuid === roadWorkActivity.properties.areaManager.uuid;
            }

            let filterProjectManager: User | undefined;
            if (showActivity && this.filterProjectManagerControl.value)
              filterProjectManager = this.filterProjectManagerControl.value as User;
            if (filterProjectManager && roadWorkActivity.properties.projectManager) {
              showActivity = filterProjectManager.uuid === roadWorkActivity.properties.projectManager.uuid;
            }

          }          

          return showActivity;
        });*/
    return true;
  } 

  /**
   * Builds a unique list of area managers from the given activity features.
   * @param roadWorkActivityFeatures Source features
   * @returns Unique users who appear as area managers
   */
  filterUniqueAreaManagers(roadWorkActivityFeatures: RoadWorkActivityFeature[]): User[] {
    let resultUuids: string[] = [];
    let result: User[] = [];
    for (let roadWorkActivityFeature of roadWorkActivityFeatures) {
      if (roadWorkActivityFeature.properties.areaManager &&
        roadWorkActivityFeature.properties.areaManager &&
        !resultUuids.includes(roadWorkActivityFeature.properties.areaManager.uuid)
      ) {
        resultUuids.push(roadWorkActivityFeature.properties.areaManager.uuid);
        result.push(roadWorkActivityFeature.properties.areaManager);
      }
    }
    return result;
  }

  /**
   * Extracts a list of involved organization abbreviations from an activity.
   * Duplicates are removed while preserving the first occurrence order.
   * @param roadWorkActivity The activity feature
   * @returns Array of org unit abbreviations
   */
  getInvolvedOrgsNames(roadWorkActivity: RoadWorkActivityFeature): string[] {
    let result: string[] = [];
    if (roadWorkActivity) {
      for (let involvedUser of roadWorkActivity.properties.involvedUsers) {
        if (!result.includes(involvedUser.organisationalUnit.abbreviation))
          result.push(involvedUser.organisationalUnit.abbreviation);
      }
    }
    return result;
  }

  /**
   * Calculates the calendar quarter (1–4) for the given date.
   * @param date A Date or ISO string
   * @returns Quarter index
   */
  getQuarter(date: Date | string): number {
    const d = new Date(date);
    return Math.floor(d.getMonth() / 3) + 1;
  }

  /**
   * Returns inline style for due-date chip based on current time:
   * - Red: overdue (>= 1 day late)
   * - Orange: within 3 days before due
   * - Green: otherwise
   * @param roadworkActivity Activity to evaluate
   * @returns CSS style string for background color
   */
  getColorDueDate(roadworkActivity: RoadWorkActivityFeature): string {
    if (roadworkActivity) {
      const today: Date = new Date();
      const dueDate = this.calcDueDate(roadworkActivity);
      if (dueDate) {
        let threeDaysBeforeDue: Date = new Date(dueDate);
        threeDaysBeforeDue.setDate(dueDate.getDate() - 3);
        let oneDayAfterDue = new Date(dueDate);
        oneDayAfterDue.setDate(dueDate.getDate() + 1);
        if (today >= oneDayAfterDue)
          return "background-color: rgb(255, 109, 109);";
        else if (today >= threeDaysBeforeDue)
          return "background-color: rgb(255, 194, 109);";
      }
    }
    return "background-color: rgb(109, 255, 121);";
  }

  /**
   * Derives a due date depending on the activity status:
   * - inconsult1/verified1/inconsult2/verified2 → consult end date 1/2
   * - reporting → report end date
   * - coordinated → info end date
   * - otherwise → today + 7 days (fallback)
   * @param roadworkActivity Activity to evaluate
   * @returns Calculated due date or undefined
   */
  calcDueDate(roadworkActivity: RoadWorkActivityFeature): Date | undefined {
    let result = undefined;
    if (roadworkActivity.properties.status == "inconsult1" ||
        roadworkActivity.properties.status == "verified1"  ||
        roadworkActivity.properties.status == "inconsult2" ||
        roadworkActivity.properties.status == "verified2") {
      if (roadworkActivity.properties.dateConsultEnd1)
        result = new Date(roadworkActivity.properties.dateConsultEnd1)
      else if (roadworkActivity.properties.dateConsultEnd2)
        result = new Date(roadworkActivity.properties.dateConsultEnd2);
    } else if (roadworkActivity.properties.status == "reporting") {
      if (roadworkActivity.properties.dateReportEnd)
        result = new Date(roadworkActivity.properties.dateReportEnd);
    } else if (roadworkActivity.properties.status == "coordinated") {
      if (roadworkActivity.properties.dateInfoEnd)
        result = new Date(roadworkActivity.properties.dateInfoEnd);
    } else {
      result = new Date();
      result.setDate(result.getDate() + 7);
    }
    return result;
  }

  /**
   * Builds a unique list of project managers from the given activity features.
   * @param roadWorkActivityFeatures Source features
   * @returns Unique users who appear as project managers
   */
  filterUniqueProjectManagers(roadWorkActivityFeatures: RoadWorkActivityFeature[]): User[] {
    let resultUuids: string[] = [];
    let result: User[] = [];
    for (let roadWorkActivityFeature of roadWorkActivityFeatures) {
      if (roadWorkActivityFeature.properties.projectManager &&
        roadWorkActivityFeature.properties.projectManager.uuid &&
        !resultUuids.includes(roadWorkActivityFeature.properties.projectManager.uuid)
      ) {
        resultUuids.push(roadWorkActivityFeature.properties.projectManager.uuid);
        result.push(roadWorkActivityFeature.properties.projectManager);
      }
    }
    return result;
  }

}
