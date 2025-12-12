/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { OrganisationalUnit } from 'src/model/organisational-unit';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { User } from 'src/model/user';
import { ManagementAreaService } from 'src/services/management-area.service';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
import { ColDef, ColumnMenuTab } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';
import { AG_GRID_LOCALE_DE } from 'src/helper/locale.de';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
  encapsulation: ViewEncapsulation.None
})
/**
 * The WelcomeComponent is the component for the start
 * page of the roadworks-portal web application.
 */
export class WelcomeComponent implements OnInit {

  myRoadWorkNeedFeatures: RoadWorkNeedFeature[] = [];
  myRoadWorkActivityFeatures: RoadWorkActivityFeature[] = [];

  roadWorkNeedColumns: string[] = ['status', 'areaman', 'title', 'person', 'org', 'description', 'optRealYears', 'create_date', 'last_modified', 'link_cityplan', 'link_wwg'];
  roadWorkActivityColumns: string[] = ['status', 'area_man', 'title', 'involved', 'lead', 'project_man',
    'realisation_date', 'due_date', 'link_cityplan', 'link_wwg'];

  user: User = new User();
  userService: UserService;

  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;
  appVersion: string = "2025.33";

  involvedOrgs: Map<string, OrganisationalUnit>;

  private managementAreaService: ManagementAreaService;
  private snckBar: MatSnackBar;

  localeText = AG_GRID_LOCALE_DE;

   defaultColDef = {      
      sortable: true,    
      resizable: true,
      filter: 'agTextColumnFilter',
      menuTabs: ['filterMenuTab'] as ColumnMenuTab[], 
    };
  
   columnDefsNeed: ColDef[] = [    
   {
      headerName: 'Phase/Status',
      minWidth: 130,
      field: 'statusLabel',
      sortable: true,
      filter: 'agTextColumnFilter',
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
        const map: { [key: string]: { label: string; color: string } } = {
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
            background-color:${entry.color};
            color: black;
            padding: 3px 5px;
            border-radius: 10px;
            font-size: 0.8rem;
            font-weight: 500;
            white-space: nowrap;
            display: inline-block;
            line-height: 1.5">
            ${entry.label}
          </span>
        `;
      }
    },
    {
      headerName: 'GM',
      field: 'dummy',
      sortable: true,
      filter: true,
      valueGetter: ({ data }) => {
        const manager = data?.properties?.managementArea?.manager;
        return manager
          ? `${manager.firstName} ${manager.lastName}`
          : '';
      },
      cellRenderer: ({ value }: any) => {
        return value || '–';
      }
    },    
    {
      headerName: 'Bezeichnung',
      minWidth: 400, 
      sortable: true,
      filter: true,
      valueGetter: (params: any) => {
        const name = params.data?.properties?.name;
        return name || '';
      },
      cellRenderer: (params: any) => {
        const name = params.data?.properties?.name;
        const section = params.data?.properties?.section;
        const uuid = params.data?.properties?.uuid;
        const tooltip = `${name} ${section || ''}`;
        return `<a href="/civil-engineering/roadworks-portal//needs/${uuid}" title="${tooltip}">${name}</a>`;
      }
    },
    {
      headerName: 'Auslösende:r',
      valueGetter: ({ data }) =>
        `${data.properties.orderer.firstName} ${data.properties.orderer.lastName}`
    },
    {
      headerName: 'Auslösendes Werk',
      field: 'properties.orderer.organisationalUnit.abbreviation'
    },
    {
      headerName: 'Auslösegrund',
      field: 'properties.description'
    },
    {
      headerName: 'Wunschtermin',
      width: 160,
      valueGetter: ({ data }) => {
        const finish = data.properties.finishOptimumTo;
        if (!finish) return '';
        const date = new Date(finish);
        const month = date.getMonth();
        const quarter = Math.floor(month / 3) + 1;
        return `${quarter}.Q ${date.getFullYear()}`;
      }
    },
    {
      headerName: 'Bedarf erfasst',
      width: 150,
      field: 'properties.created',
      sortable: true,
      filter: 'agDateColumnFilter',
      valueGetter: ({ data }) => {
        const raw = data?.properties?.created;
        return raw ? new Date(raw) : null;
      },
      valueFormatter: ({ value }) => {
        return value instanceof Date
          ? value.toLocaleDateString('de-CH')
          : '';
      },
      filterParams: {
        comparator: (filterLocalDateAtMidnight: Date, cellValue: Date) => {
          if (!(cellValue instanceof Date)) return -1;
          const cellDate = new Date(
            cellValue.getFullYear(),
            cellValue.getMonth(),
            cellValue.getDate()
          );
          if (cellDate < filterLocalDateAtMidnight) return -1;
          if (cellDate > filterLocalDateAtMidnight) return 1;
          return 0;
        },
        browserDatePicker: true
      }
    },   
    {
      headerName: 'Letzte Änderung',
      width: 160,
      field: 'properties.lastModified',
      sortable: true,
      filter: 'agDateColumnFilter',
      valueGetter: ({ data }) => {
        const raw = data?.properties?.lastModified;
        return raw ? new Date(raw) : null;
      },
      valueFormatter: ({ value }) =>
        value instanceof Date ? value.toLocaleDateString('de-CH') : '',
      filterParams: {
        comparator: (filterDate: Date, cellValue: Date) => {
          if (!(cellValue instanceof Date)) return -1;

          const cellDate = new Date(
            cellValue.getFullYear(),
            cellValue.getMonth(),
            cellValue.getDate()
          );

          if (cellDate < filterDate) return -1;
          if (cellDate > filterDate) return 1;
          return 0;
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
      cellRenderer: ({ data } : any) => {
        const x = data.geometry.coordinates[0].x;
        const y = data.geometry.coordinates[0].y;
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
        const x = data.geometry.coordinates[0].x;
        const y = data.geometry.coordinates[0].y;
        const href = `http://intramap.winport.net/projekte/tiefbau_info/start_redirect_wikis.php?&x=${x}&y=${y}`;
        return `<a href="${href}" target="_blank">Im WinWebGIS</a>`;
      }
    }
  ];

  columnDefsActivity: ColDef[] = [
    {
      headerName: 'Status',
      field: 'statusLabel',
      sortable: true,
      filter: 'agTextColumnFilter',
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
        const map: { [key: string]: { label: string; color: string } } = {
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
    },
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
      headerName: 'Bauvorhaben-Nr',
      valueGetter: ({ data }) => data?.properties?.roadWorkActivityNo || '',        
      cellRenderer: ({ value }: any) => value || '–',
      sortable: true,
      filter: true,
      sort: 'desc'
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
    /* {
      headerName: 'Lead Realisierung',
      valueGetter: ({ data }) => data?.properties?.kind?.name ?? '',
      sortable: true,
      filter: true
    }, */
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


  @ViewChild('agGridNeed') agGridNeed!: AgGridAngular;
  @ViewChild('agGridActivity') agGridActivity!: AgGridAngular;

  constructor(userService: UserService, roadWorkActivityService: RoadWorkActivityService,
    roadWorkNeedService: RoadWorkNeedService,
    managementAreaService: ManagementAreaService, snckBar: MatSnackBar) {
    this.userService = userService;
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
    this.managementAreaService = managementAreaService;
    this.snckBar = snckBar;
    this.involvedOrgs = new Map();
  }

  ngOnInit(): void {
    let loggedInUser: User = this.userService.getLocalUser();
    if (this.userService.isUserLoggedIn()) {

      this.roadWorkNeedService.getRoadWorkNeeds().subscribe({
        next: (roadWorkNeeds) => {
          let myRoadWorkNeeds: Map<string, RoadWorkNeedFeature> = new Map();
          for (let roadWorkNeed of roadWorkNeeds) {

            this.managementAreaService.getIntersectingManagementArea(roadWorkNeed.geometry)
              .subscribe({
                next: (managementArea) => {
                  if (managementArea) {
                    roadWorkNeed.properties.managementArea = managementArea;
                     setTimeout(() => {
                      if (this.agGridNeed?.api?.refreshCells) {
                        this.agGridNeed.api.refreshCells({ force: true });
                      }
                    }, 1000);
                  }
                },
                error: (error) => {
                }
              });

            if (roadWorkNeed.properties.status != "coordinated")
              if (roadWorkNeed.properties.orderer.uuid == loggedInUser.uuid)
                myRoadWorkNeeds.set(roadWorkNeed.properties.uuid, roadWorkNeed);
          }
          this.myRoadWorkNeedFeatures = Array.from(myRoadWorkNeeds.values());
        },
        error: (error) => {
        }
      });

      this.roadWorkActivityService
        .getRoadWorkActivities("", "requirement,review,inconsult1,inconsult2,reporting,verified1,verified2").subscribe({
          next: (roadWorkActivities) => {
            for (let activeRoadWorkAct of roadWorkActivities) {
              this.managementAreaService.getIntersectingManagementArea(activeRoadWorkAct.geometry)
                .subscribe({
                  next: (managementArea) => {
                    if (managementArea) {
                      activeRoadWorkAct.properties.areaManager = managementArea.manager;
                      setTimeout(() => {
                        if (this.agGridActivity?.api?.refreshCells) {
                          this.agGridActivity.api.refreshCells({ force: true });  
                        }
                      }, 1000);
                    }
                  },
                  error: (error) => {
                  }
                });
            }
            let myRoadWorkActivities: Map<string, RoadWorkActivityFeature> = new Map();
            for (let roadWorkActivity of roadWorkActivities) {
              if (roadWorkActivity.properties.areaManager) {
                if (roadWorkActivity.properties.areaManager.uuid == loggedInUser.uuid)
                  myRoadWorkActivities.set(roadWorkActivity.properties.uuid, roadWorkActivity);
                else if (roadWorkActivity.properties.projectManager.uuid = loggedInUser.uuid)
                  myRoadWorkActivities.set(roadWorkActivity.properties.uuid, roadWorkActivity);
              }

              this.myRoadWorkActivityFeatures = Array.from(myRoadWorkActivities.values());
              // prepare involvedOrgs:
              for (let roadWorkActivityFeature of this.myRoadWorkActivityFeatures) {
                for (let involvedUser of roadWorkActivityFeature.properties.involvedUsers) {
                  this.involvedOrgs.set(involvedUser.organisationalUnit.uuid, involvedUser.organisationalUnit);
                }
              }

              this.roadWorkNeedService.getRoadWorkNeeds(roadWorkActivity.properties.roadWorkNeedsUuids).subscribe({
                next: (roadWorkNeeds) => {
                  for (let roadWorkNeed of roadWorkNeeds) {
                    if (roadWorkNeed.properties.status != "coordinated")
                      if (roadWorkNeed.properties.orderer.uuid == loggedInUser.uuid)
                        myRoadWorkActivities.set(roadWorkActivity.properties.uuid, roadWorkActivity);
                  }
                  this.myRoadWorkActivityFeatures = Array.from(myRoadWorkActivities.values());
                  // prepare involvedOrgs:
                  for (let roadWorkActivityFeature of this.myRoadWorkActivityFeatures) {
                    for (let involvedUser of roadWorkActivityFeature.properties.involvedUsers) {
                      this.involvedOrgs.set(involvedUser.organisationalUnit.uuid, involvedUser.organisationalUnit);
                    }
                  }
                },
                error: (error) => {
                }
              });
            }

          },
          error: (error) => {
          }
        });

      let localUser: User = this.userService.getLocalUser();

      this.userService.getUserFromDB(localUser.mailAddress)
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
                this.user.chosenRole = localUser.chosenRole;
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
  }

  update(changePassphrase: boolean = false) {
    this.user.passPhrase = this.user.passPhrase.trim();
    if (changePassphrase && this.user.passPhrase.length == 0) {
      this.snckBar.open("Bitte Passphrase eingeben", "", {
        duration: 4000
      });
    } else {
      this.userService.updateUser(this.user, changePassphrase)
        .subscribe({
          next: (errorMessage) => {
            ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
            if (errorMessage && errorMessage.errorMessage &&
              errorMessage.errorMessage.trim().length !== 0) {
              this.snckBar.open(errorMessage.errorMessage, "", {
                duration: 4000
              });
            } else {
              this.snckBar.open("Einstellungen erfolgreich geändert", "", {
                duration: 4000
              });
            }
          },
          error: (error) => {
            this.snckBar.open("Beim Laden von Benutzerdaten ist ein Systemfehler aufgetreten. Bitte wenden Sie sich an den Administrator.", "", {
              duration: 4000
            });
          }
        });
    }
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

  openWinWebGIS(){
    window.open("http://intramap.winport.net/projekte/tiefbau_info/start_redirect.php", "_blank");
  }

  calcDueDate(roadworkActivity: RoadWorkActivityFeature): Date | undefined {
    let result = undefined;
    if (roadworkActivity.properties.status == "inconsult1" ||
        roadworkActivity.properties.status == "verified1" ||
        roadworkActivity.properties.status == "inconsult2" ||
        roadworkActivity.properties.status == "verified2"
    ) {
      if (roadworkActivity.properties.dateConsultEnd1)
        result = new Date(roadworkActivity.properties.dateConsultEnd1);
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


}
