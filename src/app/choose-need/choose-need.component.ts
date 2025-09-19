/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 *
 * ChooseNeedComponent
 * -------------------
 * Component to browse and filter roadwork needs (Bedarfe). Fetches needs from
 * the service with server-side filters, enriches with management area, and
 * renders them in AG Grid with localized date handling and link-outs.
 *
 * Notes:
 * - Uses lazy grid refresh after enrichment to update derived columns.
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

  /** Controls global loading indicator until grid data is ready. */
  isDataLoading = false;

  /** Server-provided list of need features. */
  roadWorkNeedFeatures: RoadWorkNeedFeature[] = [];

  /** Filter UI state and values. */
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

  /** Current logged-in user model (resolved on init). */
  user: User = new User();
  userService: UserService;

  /** Distinct lists for filter dropdowns (computed from results). */
  areaManagers: User[] = [];
  orderers: User[] = [];

  /** Status codes used for server-side filtering. */
  statusFilterCodes: string[] = ["requirement"];

  /** Column order for a material-style table (AG Grid configured below). */
  tableDisplayedColumns: string[] = ['status', 'areaman', 'title', 'person', 'org', 'description', 'optRealYears', 'create_date', 'last_modified', 'link_cityplan', 'link_wwg'];

  private roadWorkNeedService: RoadWorkNeedService;
  private managementAreaService: ManagementAreaService;
  private snckBar: MatSnackBar;    

  /** German translations for AG Grid UI. */
  localeText = AG_GRID_LOCALE_DE;

  /** Default AG Grid column behavior; overrides are defined per column. */
  defaultColDef: ColDef = {
    sortable: true,    
    resizable: true,
    filter: 'agTextColumnFilter',
    menuTabs: ['filterMenuTab'],     
  };

  /**
   * Column definitions for AG Grid:
   * - Status badge rendering,
   * - Linkified names,
   * - Date columns with de-CH formatting and proper filter comparators,
   * - External links to Stadtplan/WinWebGIS based on geometry.
   */
  columnDefs: ColDef[] = [    
    {
      headerName: 'Phase/Status',
      minWidth: 130,
      field: 'statusLabel', 
      sortable: true,
      filter: 'agSetColumnFilter',
      valueGetter: ({ data }) => {
        // Map raw status to human-friendly label; default to raw if unmapped.
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
        // Render colored pill for status indicator.
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
        // Extract manager full name from resolved managementArea.
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
        // Safe access to need name for sorting/filtering.
        const name = params.data?.properties?.name;
        return name || '';
      },
      cellRenderer: (params: any) => {
        // Link to need details; includes section in title tooltip.
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
        // Format finishOptimumTo as "Q.YYYY".
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
        // Provide a Date object to AG Grid; null if unavailable.
        const raw = data?.properties?.created;
        return raw ? new Date(raw) : null;
      },
      valueFormatter: ({ value }) => {
        // de-CH date formatting for display.
        return value instanceof Date
          ? value.toLocaleDateString('de-CH')
          : '';
      },
      filterParams: {
        // Compare dates at midnight for stable equality semantics.
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
        // Provide a Date object to AG Grid; null if unavailable.
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
        // External link to Stadtplan at need coordinates.
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
        // External link to WinWebGIS at need coordinates.
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
    this.isDataLoading = true;
  }

  /**
   * Lifecycle: fetch needs with current filter settings and resolve current user.
   * Shows backend messages (if any) in a snackbar.
   */
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

  /**
   * Calls the service with server-side filters; enriches each need with
   * management area and collects unique managers/orderers for dropdowns.
   * Refreshes the grid after a short delay to reflect async updates.
   */
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
                // Normalize geometry to RoadworkPolygon wrapper.
                let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
                blowUpPoly.coordinates = roadWorkNeed.geometry.coordinates;
                roadWorkNeed.geometry = blowUpPoly;

                // Track unique orderers for filter UI.
                this._addOrderer(roadWorkNeed.properties.orderer)

                // Lookup intersecting management area and attach to feature.
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
                      // Silent error keeps feature but without area metadata.
                    }
                  });
              }

              this.roadWorkNeedFeatures = roadWorkNeeds;

              // Refresh grid after enrichment; guard against undefined agGrid.api.
              setTimeout(() => {
                if (this.agGrid?.api?.refreshCells) {
                  this.agGrid.api.refreshCells({ force: true });  
                  this.isDataLoading = false;
                }
              }, 1500);
              
            },
            error: (error) => {
              this.isDataLoading = false;
            }
          });
    }

  }

  /** Utility: returns quarter (1–4) for a given Date or ISO string. */
  getQuarter(date: Date | string): number {
    const d = new Date(date);
    return Math.floor(d.getMonth() / 3) + 1;
  }

  /**
   * Collects a unique list of area managers; used to populate the filter.
   * No-op if the manager is already present.
   */
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

  /**
   * Collects a unique list of orderers; used to populate the filter.
   * No-op if the orderer is already present.
   */
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
