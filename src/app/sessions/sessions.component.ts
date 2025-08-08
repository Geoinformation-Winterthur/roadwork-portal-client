/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit, ViewChild } from '@angular/core';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User } from 'src/model/user';
import { ColDef } from 'ag-grid-community';
import { AgGridAngular } from 'ag-grid-angular';


import { AG_GRID_LOCALE_DE } from 'src/helper/locale.de';
import {  
  ColGroupDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ISetFilterParams,  
  ModuleRegistry,  
} from "ag-grid-community";


@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.css']
})
export class SessionsComponent implements OnInit {

  isDataLoading = false;

  sessionsData: any = [ {a1: "Phase 123", bv: "Rosenbergstarsse 1", a2: "2025-01-18", a3: true, a4: false, a5: true, a6: "Max1 Mustermann", a7: "2025-07-28"},
                        {a1: "Phase 456", bv: "Rosenbergstarsse 2", a2: "2025-02-21", a3: false, a4: false, a5: true, a6: "Max2 Mustermann", a7: "2025-07-29"},
                        {a1: "Phase 789", bv: "Rosenbergstarsse 3", a2: "2025-03-25", a3: false, a4: false, a5: true, a6: "Max3 Mustermann", a7: "2025-07-30"}
  ];
  
  columnDefs: ColDef[] = [    
    { headerName: 'Phase/Status',       
      field: "a1",  
      filter: "agSetColumnFilter",     
      sortable: true,
      editable: true
    },      
    { headerName: 'Bauvorhaben',       
      field: "bv",  
      filter: "agSetColumnFilter",     
      sortable: true,
      editable: true
    }, 
    { headerName: 'Datum Genehmigung',  
      field: "a2",  
      filter: "agDateColumnFilter",     
      sortable: true,
      editable: true, 
      filterParams: {
        comparator: (filterLocalDateAtMidnight: Date, cellValue: string) => {
          const cellDate = new Date(cellValue);
          if (cellDate < filterLocalDateAtMidnight) return -1;
          if (cellDate > filterLocalDateAtMidnight) return 1;
          return 0;
        }
      }
    },
    { headerName: 'Ersteller',          
      field: "a6",  
      filter: "agNumberColumnFilter",  
      sortable: true,
      editable: true,
    },
    { headerName: 'Datum',              
      field: "a7",  
      sortable: true,
      editable: true,
      filter: "agDateColumnFilter",  
      filterParams: {
        comparator: (filterLocalDateAtMidnight: Date, cellValue: string) => {
          const cellDate = new Date(cellValue);
          if (cellDate < filterLocalDateAtMidnight) return -1;
          if (cellDate > filterLocalDateAtMidnight) return 1;
          return 0;
        }
      }
     },
    { headerName: 'Berichtstyp',        
      field: "a3",  
      editable: true,
      sortable: true,
      filter: "agSetColumnFilter",              
    },
    { headerName: 'Vor-Protokol SKS',  
      field: 'a4',
      editable: true,
      sortable: true,
      cellRenderer: 'agCheckboxCellRenderer', 
      cellEditor: 'agCheckboxCellEditor', 
      filter: 'agSetColumnFilter',           
    },
    { headerName: 'Protokol SKS',       
      field: "a5",  
      filter: "agSetColumnFilter",  
      sortable: true, 
      editable: true,
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',
    }, 
    {
      headerName: 'Bericht',
      cellRenderer: (params: any) => {
        const button = document.createElement('button');
        button.innerText = 'Show Bericht';
        button.addEventListener('click', () => {
          alert(params.data.a1);
        });
        return button;
      }
  }   
  ];
  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 200,
    floatingFilter: true,
  };
  
  user: User = new User();
  userService: UserService;  
  
  private roadWorkNeedService: RoadWorkNeedService; 
  private snckBar: MatSnackBar;    

  localeText = AG_GRID_LOCALE_DE;
 
  
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;


  constructor(
      roadWorkNeedService: RoadWorkNeedService, 
      userService: UserService,
      snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.userService = userService;
    this.snckBar = snckBar;
    this.isDataLoading = true;        
  }

  ngOnInit(): void {  

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
          this.isDataLoading = false;
        },
        error: (error) => {
          this.snckBar.open("Beim Laden von Benutzerdaten ist ein Systemfehler aufgetreten. Bitte wenden Sie sich an den Administrator.", "", {
            duration: 4000
          });
          this.isDataLoading = false;
        }
      });
  
  }  

}
