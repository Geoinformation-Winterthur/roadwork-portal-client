/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit, ViewChild } from '@angular/core';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User } from 'src/model/user';
import { ManagementAreaService } from 'src/services/management-area.service';
import { ColDef } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';
import { AG_GRID_LOCALE_DE } from 'src/helper/locale.de';


@Component({
  selector: 'app-choose-need',
  templateUrl: './choose-need.component.html',
  styleUrls: ['./choose-need.component.css']
})
export class ChooseNeedComponent implements OnInit {

  roadWorkNeedFeatures: RoadWorkNeedFeature[] = [];

  filterPanelOpen: boolean = false;
  filterNeedName: string = "";
  filterNeedYearOptFrom?: number;
  filterRelevance?: number;
  filterDateOfCreation?: Date;
  filterFinishOptimumTo?: Date;
  filterMyNeeds?: boolean = false;
  filterWithDeleteComment?: boolean = false;
  filterAreaManager?: User;
  filterOrderer?: User;

  user: User = new User();
  userService: UserService;

  areaManagers: User[] = [];
  orderers: User[] = [];

  statusFilterCodes: string[] = ["requirement"];

  tableDisplayedColumns: string[] = ['status', 'areaman', 'title', 'person', 'org', 'description', 'optRealYears', 'create_date', 'last_modified', 'link_cityplan', 'link_wwg'];

  private roadWorkNeedService: RoadWorkNeedService;
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
      headerName: 'Phase/Status',
      minWidth: 130,
      field: 'properties.status',
      sortable: true,
      filter: true,
      valueGetter: ({ data }: any) => data?.properties?.status ?? '',
      cellRenderer: ({ value }: any) => {
        const map: { [key: string]: { label: string; color: string } } = {
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

        const entry = map[value];
        if (!entry) return value;

        return `
          <span style="
            background-color:${entry.color};
            color: black;
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 1rem;
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
  
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

 

  constructor(roadWorkNeedService: RoadWorkNeedService, userService: UserService,
    managementAreaService: ManagementAreaService, snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.managementAreaService = managementAreaService;
    this.userService = userService;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.getNeedsWithFilter();

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

  getNeedsWithFilter() {

    let roadWorkNeedName: string = this.filterNeedName.trim().toLowerCase();

    if (this.statusFilterCodes.length == 0) {
      this.roadWorkNeedFeatures = [];
    } else {
      this.roadWorkNeedService
        .getRoadWorkNeeds([], this.filterNeedYearOptFrom, this.filterFinishOptimumTo,
          roadWorkNeedName, this.filterAreaManager?.uuid, this.filterOrderer?.uuid,
          this.filterMyNeeds, this.filterWithDeleteComment, this.filterRelevance,
          this.filterDateOfCreation, this.statusFilterCodes).subscribe({
            next: (roadWorkNeeds) => {

              for (let roadWorkNeed of roadWorkNeeds) {
                let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
                blowUpPoly.coordinates = roadWorkNeed.geometry.coordinates;
                roadWorkNeed.geometry = blowUpPoly;
                this._addOrderer(roadWorkNeed.properties.orderer)
                this.managementAreaService.getIntersectingManagementArea(roadWorkNeed.geometry)
                  .subscribe({
                    next: (managementArea) => {
                      if (roadWorkNeed && managementArea) {
                        roadWorkNeed.properties.managementArea = managementArea;
                        if (managementArea.manager && managementArea.manager.uuid)
                          this._addAreaManager(managementArea.manager);
                      }
                    },
                    error: (error) => {
                    }
                  });
              }

              this.roadWorkNeedFeatures = roadWorkNeeds;

              setTimeout(() => {
                if (this.agGrid?.api?.refreshCells) {
                  this.agGrid.api.refreshCells({ force: true });  
                }
              }, 2000);
              
            },
            error: (error) => {
            }
          });
    }

  }

  getQuarter(date: Date | string): number {
    const d = new Date(date);
    return Math.floor(d.getMonth() / 3) + 1;
  }

  private _addAreaManager(areaManager: User) {

    let containsAlready: boolean = false;
    for (let areaManagerThis of this.areaManagers) {
      if (areaManagerThis.uuid === areaManager.uuid) {
        containsAlready = true;
        break;
      }
    }

    if (!containsAlready)
      this.areaManagers.push(areaManager);

  }

  private _addOrderer(orderer: User) {

    let containsAlready: boolean = false;
    for (let ordererThis of this.orderers) {
      if (ordererThis.uuid === orderer.uuid) {
        containsAlready = true;
        break;
      }
    }

    if (!containsAlready)
      this.orderers.push(orderer);

  }

}
