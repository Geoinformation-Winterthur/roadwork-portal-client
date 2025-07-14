/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
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

  isDataLoading: boolean = false;

  roadWorkActivityFeatures: RoadWorkActivityFeature[] = [];
  roadWorkActivityFeaturesFiltered: RoadWorkActivityFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenActivityName: string = "";
  chosenActivityYearFrom?: number;
  filterMyActivities?: boolean = false;
  filterDueDate?: Date;
  filterStartOfConstruction?: Date;
  filterEvaluationSks?: number;
  filterAreaManagerControl: FormControl = new FormControl();
  filterProjectManagerControl: FormControl = new FormControl();

  statusFilterCodes: string[] = ["review", "inconsult1", "inconsult2", "verified1", "verified2", "reporting", "coordinated", "prestudy"];

  tableDisplayedColumns: string[] = ['status', 'area_man', 'title', 'involved', 'lead', 'project_man',
    'realisation_date', 'due_date', 'link_cityplan', 'link_wwg'];

  user: User = new User();
  userService: UserService;

  private roadWorkActivityService: RoadWorkActivityService;
  private managementAreaService: ManagementAreaService;
  private snckBar: MatSnackBar;

  localeText = AG_GRID_LOCALE_DE;

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
  };

  columnDefs: ColDef[] = [
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
          inconsult1: '12/Bedarfsklärung-1',
          inconsult2: '12/Bedarfsklärung-2',
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
          inconsult1: { label: '12/Bedarfsklärung-1', color: '#4fc3f7' },
          inconsult2: { label: '12/Bedarfsklärung-2', color: '#4fc3f7' },
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
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 0.9rem;
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
    {
      headerName: 'Lead Realisierung',
      valueGetter: ({ data }) => data?.properties?.kind?.name ?? '',
      sortable: true,
      filter: true
    },
    {
      headerName: 'PL',
      valueGetter: ({ data }) => {
        const m = data?.properties?.projectManager;
        return m ? `${m.firstName} ${m.lastName}` : '';
      },
      sortable: true,
      filter: true
    },
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


  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  constructor(roadWorkActivityService: RoadWorkActivityService,
    userService: UserService, managementAreaService: ManagementAreaService,
    snckBar: MatSnackBar) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.managementAreaService = managementAreaService;
    this.snckBar = snckBar;
    this.isDataLoading = true;
  }

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

  getQuarter(date: Date | string): number {
    const d = new Date(date);
    return Math.floor(d.getMonth() / 3) + 1;
  }

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
