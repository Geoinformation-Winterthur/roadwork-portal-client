/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 * 
 * ConsultationItemsComponent
 * --------------------------
 * Component to manage and submit consultation feedback for road work needs
 * associated with a given road work activity.
 * 
 * Notes:
 * - Lists all needs linked to the activity, allowing the current user to
 *   provide feedback (still relevant / decline + free-text comment).
 * - Shows needs of other participants in read-only mode for context.
 * - Allows creating a new need after submitting feedback, if none existed before.
 * 
 */
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { StatusHelper } from 'src/helper/status-helper';
import { TimeFactorHelper } from 'src/helper/time-factor-helper';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { User } from 'src/model/user';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';

@Component({
  selector: 'app-consultation-items',
  templateUrl: './consultation-items.component.html',
  styleUrls: ['./consultation-items.component.css']
})
export class ConsultationItemsComponent implements OnInit, OnChanges {

  /** Activity that drives the consultation context (provided by parent). */
  @Input()
  roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();

  /** Column order for the consultation table UI. */
  tableDisplayedColumns: string[] = ['name', 'organisation', 'participant', 'feedback', 'date_last_change', 'has_feedback', 'still_requirement', 'temporal_factor', 'new_requirement', 'consult_input'];

  /** Currently logged-in user (resolved/updated in _rebuildLists). */
  user: User;
  userService: UserService;

  /** Needs associated to the current activity (all participants). */
  needsOfActivity: RoadWorkNeedFeature[] = [];
  /** Subset of needs belonging to the current user (for feedback/edit). */
  needsOfUser: RoadWorkNeedFeature[] = [];

  /** Helper to interpret and display status-related information. */
  statusHelper: StatusHelper;

  /** UI state: whether the user declines their need(s). */
  decline: boolean = false;
  /** UI state: whether the need(s) are still considered relevant. */
  stillRelevant: boolean = false;

  /** Free-text feedback from the orderer (persisted with the need). */
  ordererFeedbackText: string = "";
  
  /** True if the current role is not allowed to edit (non-admin, non-territorymanager). */
  isEditingForRoleNotAllowed: boolean = false;

  /** Radio selection controlling decline vs. still relevant. */
  selectedNeedOption: 'stillRelevant' | 'decline' = 'decline';
  /** Enables creation of a new need after feedback submission. */
  canCreateNeed: boolean = false;

  /** Services and routers injected via constructor. */
  needsOfActivityService: NeedsOfActivityService;
  private roadWorkNeedService: RoadWorkNeedService;
  private router: Router;
  private snckBar: MatSnackBar;  

  constructor(needsOfActivityService: NeedsOfActivityService,
    roadWorkNeedService: RoadWorkNeedService,
    router: Router,
    userService: UserService, snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.userService = userService;
    this.user = userService.getLocalUser();
    this.snckBar = snckBar;
    this.router = router;
    this.statusHelper = new StatusHelper();
    // Editing is only allowed for administrators or territory managers.
    this.isEditingForRoleNotAllowed = this.userService.getLocalUser().chosenRole != 'administrator' && this.userService.getLocalUser().chosenRole != 'territorymanager';
  }

  /** Angular lifecycle: initial load/derivation of lists from the current input. */
  ngOnInit() {
    this._rebuildLists();
  }

  /**
   * Angular lifecycle: re-run list derivation whenever the input activity changes.
   * @param _ Angular change envelope (unused).
   */
  ngOnChanges(_: SimpleChanges) {
    this._rebuildLists();
  }

  /**
   * Persist feedback for all needs belonging to the current user.
   * - Sets decline/stillRelevant flags based on the radio selection.
   * - Marks `feedbackGiven` and writes the free-text comment.
   * - Shows a single snackbar message for the batch operation.
   */
  saveNeedsOfUser() {
    if (this.selectedNeedOption == "decline") {
      this.decline = true;
      this.stillRelevant = false;
    } 

    if (this.selectedNeedOption == "stillRelevant") {
      this.stillRelevant = true;
      this.decline = false;
    }    

    let messageShown: boolean = false;
    for (let needOfUser of this.needsOfUser) {
      // Apply the same feedback parameters to every need of the current user.
      needOfUser.properties.decline = this.decline;
      needOfUser.properties.stillRelevant = this.stillRelevant;      
      needOfUser.properties.feedbackGiven = true;
      needOfUser.properties.comment = this.ordererFeedbackText;
      this.roadWorkNeedService
        .updateRoadWorkNeed(needOfUser)
        .subscribe({
          next: (roadWorkNeedFeature) => {
            if (roadWorkNeedFeature) {
              // Expand coded error messages (SSP-<n>) into human-readable form.
              ErrorMessageEvaluation._evaluateErrorMessage(roadWorkNeedFeature);
              if (roadWorkNeedFeature.errorMessage !== "") {
                if (!messageShown) {
                  this.snckBar.open(roadWorkNeedFeature.errorMessage, "", {
                    duration: 4000
                  });
                  messageShown = true;
                }
              } else {
                if (!messageShown) {
                  this.snckBar.open("Rückmeldung gespeichert", "", {
                    duration: 4000
                  });
                  messageShown = true;
                }
              }
            }
          },
          error: (error) => {
            // Silent catch; could show a generic error if desired.
          }
        });
    }
  }

  /**
   * Update and persist the comment for a single need, showing result feedback.
   * @param roadWorkNeed Need to update (comment is read from its properties).
   */
  updateComment(roadWorkNeed: RoadWorkNeedFeature) {
    this.roadWorkNeedService.updateRoadWorkNeed(roadWorkNeed)
      .subscribe({
        next: (roadWorkNeed) => {
          if (roadWorkNeed) {
            ErrorMessageEvaluation._evaluateErrorMessage(roadWorkNeed);
            if (roadWorkNeed.errorMessage.trim().length !== 0) {
              this.snckBar.open(roadWorkNeed.errorMessage, "", {
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
   * Check whether the current user has already entered a requirement/need
   * for this activity (based on UUID equality).
   */
  hasRequirementAlreadyEntered(): boolean {
    for (let needOfActivity of this.needsOfActivity) {
      if (needOfActivity.properties.uuid &&
        needOfActivity.properties.orderer.uuid == this.user.uuid) {
        return true;
      }
    }
    return false;
  }

  /**
   * Navigate to the "create new need" page, pre-filling parameters from an
   * existing need of the activity (prefer the primary one if available).
   */
  createNewNeed() {
    let protoNeed: RoadWorkNeedFeature | undefined;
    for (let needOfActivity of this.needsOfActivity) {
      protoNeed = needOfActivity;
      if (needOfActivity.properties.isPrimary)
        break;
    }
    if (protoNeed) {
      // Prepare query parameters using finish windows and current geometry.
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
   * Wrapper around TimeFactorHelper to compute the relative temporal factor
   * between a comparison need and the activity's primary need.
   */
  calcTimeFactor(compareNeed: RoadWorkNeedFeature, primaryNeed: RoadWorkNeedFeature): number {
    return TimeFactorHelper.calcTimeFactor(compareNeed, primaryNeed);
  }

  /**
   * Refreshes `user`, fetches needs for the current activity, and builds:
   * - `needsOfActivity`: all needs of involved users (creates dummy entries for
   *   participants without feedback yet).
   * - `needsOfUser`: only the needs belonging to the current user.
   * Also sets `stillRelevant` to false if any need indicates otherwise.
   */
  private _rebuildLists() {
    // Ensure we have the latest user model (and UUID) from the backend.
    this.userService.getUserFromDB(this.userService.getLocalUser().mailAddress)
      .subscribe({
        next: (user) => {
          if (user && user.length > 0)
            this.user = user[0];
        },
        error: (error) => {
          // No-op on error; `this.user` remains as the local user.
        }
      });

    // Query all needs linked to the current activity (filters mostly undefined).
    this.roadWorkNeedService.getRoadWorkNeeds([], undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, this.roadWorkActivity.properties.uuid).subscribe({
        next: (roadWorkNeeds) => {
          let needsOfActivityTemp = [];
          let needsOfUserTemp = [];
          // Assume still relevant unless any need says otherwise.
          this.stillRelevant = true;
          for (let roadWorkNeed of roadWorkNeeds) {
            needsOfActivityTemp.push(roadWorkNeed);
            if (roadWorkNeed.properties.orderer.uuid == this.user.uuid)
              needsOfUserTemp.push(roadWorkNeed);
            if (!roadWorkNeed.properties.stillRelevant) {
              this.stillRelevant = false;
            }
          }
          // Ensure every involved user has a row—even if no feedback/need exists yet.
          for (let involvedUser of this.roadWorkActivity.properties.involvedUsers) {
            let userHasFeedback = false;
            for (let needOfActivity of needsOfActivityTemp) {
              if (involvedUser.uuid == needOfActivity.properties.orderer.uuid) {
                userHasFeedback = true;
                break;
              }
            }
            if (!userHasFeedback) {
              // Create a placeholder need so the table shows the participant.
              let dummyRoadWorkNeed = new RoadWorkNeedFeature();
              dummyRoadWorkNeed.properties.orderer = involvedUser;
              needsOfActivityTemp.push(dummyRoadWorkNeed);
            }
          }
          this.needsOfActivity = needsOfActivityTemp;
          this.needsOfUser = needsOfUserTemp;
        },
        error: (error) => {
          // Silent catch; UI keeps previous state.
        }
      });

    // Inform the service about the current intersecting needs for this activity.
    if (this.roadWorkActivity.properties.uuid) {
      this.needsOfActivityService.updateIntersectingRoadWorkNeeds(this.roadWorkActivity.properties.uuid, this.needsOfActivity);
    }
  }

  /**
   * Handler for the "send" action:
   * - Persists user feedback (decline/still relevant + comment).
   * - Enables the UI option to create a new need afterwards.
   */
  onSendClicked(): void {
    
    this.saveNeedsOfUser();    

    this.canCreateNeed = true;

  }

}
