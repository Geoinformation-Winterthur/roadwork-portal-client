/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 *
 * ReportingItemsComponent
 * -----------------------
 * Displays and manages consultation inputs for a given roadwork activity during a feedback phase.
 * 
 * Responsibilities:
 * - Shows a list of consultation inputs filtered by the current `feedbackPhase`.
 * - Allows authorized users to add/remove participants (assign users) and to submit feedback.
 * - Navigates to the "create need" screen with parameters derived from an assigned primary need.
 *
 */

import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { PdfDocumentHelper } from 'src/helper/pdf-document-helper';
import { StatusHelper } from 'src/helper/status-helper';
import { ConsultationInput } from 'src/model/consultation-input';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { User } from 'src/model/user';
import { ConsultationService } from 'src/services/consultation.service';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { UserService } from 'src/services/user.service';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { Router } from '@angular/router';
import { ColDef, ColumnMenuTab } from 'ag-grid-community';
import { Observable, tap, catchError, of, lastValueFrom, concatMap, map } from 'rxjs';
import { List } from 'echarts';

@Component({
  selector: 'app-reporting-items',
  templateUrl: './reporting-items.component.html',
  styleUrls: ['./reporting-items.component.css']
})
export class ReportingItemsComponent implements OnInit {

  /** Roadwork activity that this component presents/edits feedback for. */
  @Input()
  roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();
  
  /** Current feedback phase key (e.g., 'inconsult1', 'verified1', ...). */
  @Input()
  feedbackPhase: string = 'inconsult1';
  
  /** Phase code used to mark the transition to "accomplished". */
  @Input()
  feedbackPhaseAccomplished: string = 'review';

  /** Human-readable name of the current phase shown in the UI. */
  @Input()
  feedbackPhaseName: string = 'Phasenbezeichnung';
  
  /** All consultation inputs for this activity filtered to the chosen phase. */
  consultationInputsFromReporting: ConsultationInput[] = [];

  /** Currently logged-in user (fetched on init). */
  user: User;
  userService: UserService;

  /** Permission flags, computed on init based on role & phase. */
  isConsultationInputAllowed: boolean = false;
  isAssigningUsersAllowed: boolean = false;
  isAssigningUsersVisible: boolean = false;

  /** Convenience phase flags for UI toggling. */
  isPhaseConsulting: boolean = true;
  isPhaseReporting: boolean = false;

  /** Candidate users to assign as consultees for this activity/phase. */
  availableUsers: User[] = [];

  /** Shared service to access needs linked to this activity. */
  needsOfActivityService: NeedsOfActivityService;

  /** Helpers exposed to the template. */
  statusHelper: StatusHelper;
  PdfDocumentHelper = PdfDocumentHelper;

  /** Injected services. */
  private consultationService: ConsultationService;
  private snckBar: MatSnackBar;
  private router: Router;

  /** Column configuration for the (assignable) users grid. */
  columnDefs: ColDef[] = [
    {
      headerName: 'Werk',
      field: 'organisationalUnit.name',
      valueGetter: (params: any) => params.data?.organisationalUnit?.name || '',
      sortable: true,
      filter: true,
      flex: 1

    },
    {
      headerName: 'Kurzzeichen',
      field: 'organisationalUnit.abbreviation',
      valueGetter: (params: any) => params.data?.organisationalUnit?.abbreviation || '',
      sortable: true,
      filter: true,
      flex: 1

    },
    {
      headerName: 'Ansprechperson',
      valueGetter: (params: any) =>
        `${params.data?.firstName || ''} ${params.data?.lastName || ''}`.trim(),
      sortable: true,
      filter: true,
      flex: 1

    },
    {
      /**
       * "Assign" button per row:
       * - Enabled only when `isAssigningUsersAllowed` is true.
       * - Calls `addConsultation` with the selected user.
       */
      headerName: 'Zuweisen',
      cellRenderer: (params:any) => {
        const button = document.createElement('button');        
        button.style.fontSize = '18px';
        button.style.margin = '10px';
        button.style.border = 'none';
        button.style.background = 'transparent';        
        if (this.isAssigningUsersAllowed) {          
          button.textContent =  '🡅';
          button.style.cursor = 'pointer';
          button.addEventListener('click', () => {            
            this.addConsultation(params.data);          
          })
        } else {
          button.textContent = 'X';
          button.style.cursor = 'not-allowed';
        };
        return button;
      },
      width: 150,

    },
  ];

  /** Default column behavior for the grid (filtering, resize, etc.). */
  defaultColDef = {      
    sortable: true,    
    resizable: true,
    filter: 'agTextColumnFilter',
    menuTabs: ['filterMenuTab'] as ColumnMenuTab[], 
  };

  /** Hidden container used to render HTML prior to export (PDF). */
  @ViewChild('reportContainer', { static: false }) reportContainer!: ElementRef;

  constructor(consultationService: ConsultationService,
    needsOfActivityService: NeedsOfActivityService,
    userService: UserService, 
    snckBar: MatSnackBar,        
    router: Router) {
    this.consultationService = consultationService;
    this.needsOfActivityService = needsOfActivityService;
    this.userService = userService;
    this.user = userService.getLocalUser();
    this.snckBar = snckBar;
    this.statusHelper = new StatusHelper();    
    this.router = router;
  }

  /**
   * Initialization flow:
   * - Compute flags for what the current user can do in the current phase.
   * - Load all users (for assignment) and refresh the logged-in user object.
   * - Load all consultation inputs for this activity, filter to phase, sort, and
   *   prepare the current user's editable `consultationInput` (if any).
   */
  ngOnInit(): void {
    this.loadData();
  }

  private loadData() {

    // Permission: who can submit consultation input in the current phase.
    if ((this.userService.getLocalUser().chosenRole === 'orderer' ||
        this.userService.getLocalUser().chosenRole === 'administrator') &&
        this.roadWorkActivity.properties.status==this.feedbackPhase ) {        
        this.isConsultationInputAllowed = true;        
    } else {
      this.isConsultationInputAllowed = false;
    }

    // Permission: who can assign consultees in the current phase.
    if ((this.userService.getLocalUser().chosenRole === 'territorymanager' ||
        this.userService.getLocalUser().chosenRole === 'administrator')
        && this.roadWorkActivity.properties.status == this.feedbackPhase
        ) {        
        this.isAssigningUsersAllowed = true;        
    } else {
      this.isAssigningUsersAllowed = false;
    }

    // Derive convenience flags for "consulting" vs "reporting" phases.
    if (this.feedbackPhase == 'inconsult1' || this.feedbackPhase == 'verified1' || this.feedbackPhase == 'inconsult2' || this.feedbackPhase == 'verified2') {
      this.isPhaseConsulting = true;
      this.isPhaseReporting = false;
    } else {
      this.isPhaseConsulting = false;
      this.isPhaseReporting = true;
    }

    // Refresh the full user object for the current session user (e.g., ensure UUID).
    this.userService.getUserFromDB(this.userService.getLocalUser().mailAddress)
      .subscribe({
        next: (user) => {
          if (user && user.length > 0)
            this.user = user[0];
        },
        error: (error) => {
        }
      });

    this.getMappedConsultationInputs().pipe(
      // Load the consultation inputs for the current activity and phase.
      tap(result => this.consultationInputsFromReporting = result),

      // Load all available users for assignment UI.
      concatMap(() => this.getAvailableUsers()),
      tap(result => this.availableUsers = result),

      // Remove already assigned users from the available list.
      tap(() => this.removeAlreadyAssignedUsers())
    ).subscribe();
  }

  private getAvailableUsers(): Observable<User[]> {
    return this.userService.getAllUsers().pipe(
      map(users => users.filter(user => user.active))
    );
  }

  private getMappedConsultationInputs(): Observable<ConsultationInput[]> {
    return this.consultationService.getConsultationInputs(this.roadWorkActivity.properties.uuid).pipe(
      map((consultationInputs) => {
        // Locale-aware sort: by org abbreviation, then by full name.
        const collator = new Intl.Collator('de-CH', { sensitivity: 'base', ignorePunctuation: true, numeric: true });

        return consultationInputs
          .filter(input =>
            input.feedbackPhase === this.feedbackPhase
          )
          .slice()
          // Sort by organisation (abbr), then by full name
          .sort((a, b) => {
            const aOrg = a?.inputBy?.organisationalUnit?.abbreviation ?? '';
            const bOrg = b?.inputBy?.organisationalUnit?.abbreviation ?? '';

            const orgCmp = collator.compare(aOrg, bOrg);
            if (orgCmp !== 0) return orgCmp;

            const aName = `${a?.inputBy?.firstName ?? ''} ${a?.inputBy?.lastName ?? ''}`.trim();
            const bName = `${b?.inputBy?.firstName ?? ''} ${b?.inputBy?.lastName ?? ''}`.trim();

            return collator.compare(aName, bName);
          });
      })
    );
  }

  private removeAlreadyAssignedUsers(): void {
    const assignedUserUuids = new Set(
      this.consultationInputsFromReporting
        .map((input) => input.inputBy?.uuid)
        .filter((uuid): uuid is string => Boolean(uuid))
    );

    this.availableUsers = this.availableUsers.filter(
      (user) => !assignedUserUuids.has(user.uuid)
    );
  }

  /**
   * Persist changes to a single consultation input.
   * - Sets `feedbackGiven` to true if the orderer feedback text is non-empty.
   * - Calls backend; shows normalized error or success via snackbar.
   */
  updateComment(consultationInput: ConsultationInput) {
    
    consultationInput.feedbackGiven = consultationInput.ordererFeedback.trim().length > 0 ?  true : false;      

    this.consultationService.updateConsultationInput(this.roadWorkActivity.properties.uuid,
      consultationInput)
      .subscribe({
        next: (consultationInput) => {
          if (consultationInput) {
            ErrorMessageEvaluation._evaluateErrorMessage(consultationInput);
            if (consultationInput.errorMessage.trim().length !== 0) {
              this.snckBar.open(consultationInput.errorMessage, "", {
                duration: 4000
              });
            } else {
              this.snckBar.open("Bemerkung gespeichert", "", {
                duration: 4000
              });
            }
          }
        },
        error: (error) => {
          this.snckBar.open("Unbekannter Fehler beim Speichern der Bemerkung", "", {
            duration: 4000
          });
        }
      });

  }
  
 
  /**
   * Assign a user to this activity for the current feedback phase.
   * Steps:
   * - Build a new `ConsultationInput` object for the user.
   * - Prevent duplicates by checking `consultationInputsFromReporting`.
   * - Persist via `ConsultationService` and append to the local list on success.
   */
  addConsultation(user: User): void {        
    let consultationInput = new ConsultationInput();
    consultationInput.inputBy.mailAddress = user.mailAddress;
    consultationInput.feedbackPhase = this.feedbackPhase;
    consultationInput.lastEdit = new Date();
    consultationInput.decline = false;
    consultationInput.valuation = 0;
    consultationInput.ordererFeedback = "";
    consultationInput.managerFeedback = "";
    consultationInput.uuid = "";
    consultationInput.inputBy = user;

    if (this.consultationInputsFromReporting.some(u => u.inputBy.uuid === user.uuid)) {
      this.snckBar.open("Vernehmlassende:r ist schon in der Liste.", undefined, {
        duration: 3000,
        panelClass: ['snackbar-warning']
      });
      return;
    }

    this.consultationService.addConsultationInput(this.roadWorkActivity.properties.uuid,
        consultationInput)
        .subscribe({
          next: (consultationInput) => {
            if (consultationInput) {
              ErrorMessageEvaluation._evaluateErrorMessage(consultationInput);
              if (consultationInput.errorMessage.trim().length !== 0) {
                this.snckBar.open(consultationInput.errorMessage, "", {
                  duration: 4000
                });
              } else {
                this.snckBar.open("Beteiligte gespeichert", "", {
                  duration: 4000
                });
              }
              // Copy server values into a new object and add to the local list.
              let consultationInputObj: ConsultationInput = new ConsultationInput();
              consultationInputObj.uuid = "" + consultationInput.uuid;
              consultationInputObj.ordererFeedback = "" + consultationInput.ordererFeedback;
              consultationInputObj.managerFeedback = "" + consultationInput.managerFeedback;
              consultationInputObj.inputBy = consultationInput.inputBy;
              consultationInputObj.feedbackPhase = this.feedbackPhase;
              consultationInputObj.lastEdit = consultationInput.lastEdit;
              consultationInputObj.decline = consultationInput.decline;
              consultationInputObj.valuation = consultationInput.valuation;

              this.consultationInputsFromReporting.push(consultationInputObj);

              // Reloads data/permissions 
              this.loadData();
            }
          },
          error: (error) => {
            this.snckBar.open("Unbekannter Fehler beim Speichern der Rückmeldung", "", {
              duration: 4000
            });
          }
        });        
  }

  /**
   * Remove a consultation input by the contributor's UUID and current phase.
   * - Uses the backend deletion endpoint.
   * - Shows normalized errors or success feedback.
   * - Re-initializes the component state afterward.
   */
  deleteConsultation(inputByUuid: string): void {    
     this.consultationService.deleteConsultationInput(this.roadWorkActivity.properties.uuid, inputByUuid, this.feedbackPhase)
      .subscribe({
        next: (error) => {
          if (error) {
            ErrorMessageEvaluation._evaluateErrorMessage(error);
            if (error.errorMessage.trim().length !== 0) {
              this.snckBar.open(error.errorMessage, "", {
                duration: 4000
              });
            } else {
              this.snckBar.open("Beteiligter wurde gelöscht", "", {
                duration: 4000
              });
            }
            this.loadData();
          }
        },
        error: (error) => {
          this.snckBar.open("Unbekannter Fehler beim Löschen des Beteiligten", "", {
            duration: 4000
          });
        }
      });
  }      

  /**
   * Create a new need using dates/geometry from a "primary" assigned need:
   * - Looks for an assigned need marked as `isPrimary` (or uses the first).
   * - Pre-fills query params with timeframe and polygon coordinates.
   * - Navigates to the "new need" route; actual creation happens there.
   */
  createNewNeed() {
    let protoNeed: RoadWorkNeedFeature | undefined;
    for (let needOfActivity of this.needsOfActivityService.assignedRoadWorkNeeds) {
      protoNeed = needOfActivity;
      if (needOfActivity.properties.isPrimary)
        break;
    }
    if (protoNeed) {
      let params = {
        finishEarlyTo: protoNeed.properties.finishEarlyTo,
        finishOptimumTo: protoNeed.properties.finishOptimumTo,
        finishLateTo: protoNeed.properties.finishLateTo,
        coordinates: RoadworkPolygon.coordinatesToString(protoNeed.geometry.coordinates)
      };
      this.router.navigate(["/needs/new"], { queryParams: params });
    }
  }

  /**
   * Assign all reviewers to this activity for the current feedback phase.
   * Steps:
   * - Build a new `ConsultationInput` object for the user.
   * - Prevent duplicates by checking `consultationInputsFromReporting`.
   * - Persist via `ConsultationService` and append to the local list on success.
   */
  addAllReviewers() { 
    let users = this.availableUsers.filter(user => user.grantedRoles.orderer //Aktuell Auslösende weil es Rolle vernehmlassende noch nicht gibt. // TODO change role orderer to role 'reviewer'
      && !this.consultationInputsFromReporting.some(consultationInput => consultationInput?.inputBy?.uuid === user.uuid)); 

    this.addConsultations(users);
  }

  /**
   * Assign users to this activity for the current feedback phase.
   * Steps:
   * - Build a new `ConsultationInput` object for the user.
   * - Prevent duplicates by checking `consultationInputsFromReporting`.
   * - Persist via `ConsultationService` and append to the local list on success.
   */
  addAllConsultations() { 
    let needs  = this.needsOfActivityService.assignedRoadWorkNeeds;
    let users = needs.map(need => need.properties?.orderer);
    
    this.addConsultations(users);
  }

  addConsultations(users: User[]) {

    let consultationInputs : ConsultationInput[] = [];

    users.forEach(user => {
      if (!this.consultationInputsFromReporting.some(consultationInput => consultationInput.inputBy.uuid === user.uuid)) {
        let consultationInput = new ConsultationInput();
        consultationInput.feedbackPhase = this.feedbackPhase;
        consultationInput.lastEdit = new Date();
        consultationInput.decline = false;
        consultationInput.valuation = 0;
        consultationInput.ordererFeedback = "";
        consultationInput.managerFeedback = "";
        consultationInput.uuid = "";
        consultationInput.inputBy = user;
        consultationInputs.push(consultationInput);
      }
    });

    this.consultationService.addConsultationInputs(this.roadWorkActivity.properties.uuid,
      consultationInputs)
      .subscribe({
        next: (affectedRowsResult) => {
          if (affectedRowsResult) {
            ErrorMessageEvaluation._evaluateErrorMessage(affectedRowsResult);
            if (affectedRowsResult.errorMessage?.trim().length !== 0) {
              this.snckBar.open(affectedRowsResult.errorMessage, "", {
                duration: 4000
              });
            } else {
              this.snckBar.open(`${affectedRowsResult.affectedRows} von ${consultationInputs.length} Beteiligte gespeichert`, "", {
                duration: 4000
              });
            }
            // Reloads data/permissions 
            this.loadData();
          }
        },
        error: (error) => {
          this.snckBar.open("Unbekannter Fehler beim Speichern der Rückmeldung", "", {
            duration: 4000
          });
        }
      });
  }
}
