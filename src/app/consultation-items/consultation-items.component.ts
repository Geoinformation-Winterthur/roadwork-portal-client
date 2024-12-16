import { AfterContentInit, AfterViewInit, Component, Input, OnChanges, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { StatusHelper } from 'src/helper/status-helper';
import { ConsultationInput } from 'src/model/consultation-input';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { User } from 'src/model/user';
import { ConsultationService } from 'src/services/consultation.service';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';

@Component({
  selector: 'app-consultation-items',
  templateUrl: './consultation-items.component.html',
  styleUrls: ['./consultation-items.component.css']
})
export class ConsultationItemsComponent {

  @Input()
  roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();

  consultationInput: ConsultationInput = new ConsultationInput();

  tableDisplayedColumns: string[] = ['name', 'organisation', 'participant', 'feedback', 'date_last_change', 'has_feedback', 'still_requirement', 'temporal_factor', 'new_requirement',  'consult_input'];

  user: User;
  userService: UserService;

  needsOfActivity: RoadWorkNeedFeature[] = [];

  statusHelper: StatusHelper;

  private consultationService: ConsultationService;
  private roadWorkNeedService: RoadWorkNeedService;
  private needsOfActivityService: NeedsOfActivityService;
  private router: Router;
  private snckBar: MatSnackBar;

  constructor(consultationService: ConsultationService,
    needsOfActivityService: NeedsOfActivityService,
    roadWorkNeedService: RoadWorkNeedService,
    router: Router,
    userService: UserService, snckBar: MatSnackBar) {
    this.consultationService = consultationService;
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.userService = userService;
    this.user = userService.getLocalUser();
    this.snckBar = snckBar;
    this.router = router;
    this.statusHelper = new StatusHelper();
  }

  ngOnInit(): void {

    this.userService.getUserFromDB(this.userService.getLocalUser().mailAddress)
      .subscribe({
        next: (user) => {
          if (user && user.length > 0)
            this.user = user[0];
        },
        error: (error) => {
        }
      });

    this.roadWorkNeedService.getRoadWorkNeeds([], undefined, undefined,
      undefined, undefined, undefined, undefined,
      undefined, undefined, this.roadWorkActivity.properties.uuid).subscribe({
        next: (roadWorkNeeds) => {
          let needsOfActivityTemp = [];
          for (let roadWorkNeed of roadWorkNeeds) {
            needsOfActivityTemp.push(roadWorkNeed);
          }
          for (let involvedUser of this.roadWorkActivity.properties.involvedUsers) {
            let userHasFeedback = false;
            for (let needOfActivity of needsOfActivityTemp) {
              if (involvedUser.uuid == needOfActivity.properties.orderer.uuid) {
                userHasFeedback = true;
                break;
              }
            }
            if (!userHasFeedback) {
              let dummyRoadWorkNeed = new RoadWorkNeedFeature();
              dummyRoadWorkNeed.properties.orderer = involvedUser;
              needsOfActivityTemp.push(dummyRoadWorkNeed);
            }
          }
          this.needsOfActivity = needsOfActivityTemp;
        },
        error: (error) => {
        }
      });


    if (this.roadWorkActivity.properties.uuid) {
      this.needsOfActivityService.updateIntersectingRoadWorkNeeds(this.roadWorkActivity.properties.uuid, this.needsOfActivity);
    }

    this.consultationInput.feedbackPhase = this.roadWorkActivity.properties.status;

    this.consultationService.getConsultationInputs(this.roadWorkActivity.properties.uuid)
      .subscribe({
        next: (consultationInputs) => {
          for (let consultationInput of consultationInputs) {
            if (consultationInput.feedbackPhase === 'inconsult') {
              for (let needOfActivity of this.needsOfActivity) {
                if (needOfActivity.properties.orderer.uuid == consultationInput.inputBy.uuid) {
                  needOfActivity.properties.comment = "Kein Bedarf für uns";
                }
              }
            }
          }

          for (let consultationInput of consultationInputs) {
            if (consultationInput.inputBy.mailAddress === this.user.mailAddress &&
              consultationInput.feedbackPhase === this.roadWorkActivity.properties.status) {
              this.consultationInput = new ConsultationInput();
              this.consultationInput.uuid = "" + consultationInput.uuid;
              this.consultationInput.ordererFeedback = "" + consultationInput.ordererFeedback;
              this.consultationInput.inputBy = consultationInput.inputBy;
              this.consultationInput.managerFeedback = "" + consultationInput.managerFeedback;
              this.consultationInput.lastEdit = consultationInput.lastEdit;
              this.consultationInput.decline = consultationInput.decline;
              this.consultationInput.valuation = consultationInput.valuation;
              this.consultationInput.feedbackPhase = consultationInput.feedbackPhase;
              break;
            }
          }

        },
        error: (error) => {
        }
      });
  }

  sendInConsult() {
    this.consultationInput.feedbackGiven = true;
    if (this.consultationInput.uuid === "") {
      this.consultationService.addConsultationInput(this.roadWorkActivity.properties.uuid,
        this.consultationInput)
        .subscribe({
          next: (consultationInput) => {
            if (consultationInput) {
              ErrorMessageEvaluation._evaluateErrorMessage(consultationInput);
              if (consultationInput.errorMessage.trim().length !== 0) {
                this.snckBar.open(consultationInput.errorMessage, "", {
                  duration: 4000
                });
              } else {
                this.snckBar.open("Rückmeldung gespeichert", "", {
                  duration: 4000
                });
              }
              let consultationInputObj: ConsultationInput = new ConsultationInput();
              consultationInputObj.uuid = "" + consultationInput.uuid;
              consultationInputObj.ordererFeedback = "" + consultationInput.ordererFeedback;
              consultationInputObj.inputBy = consultationInput.inputBy;
              consultationInputObj.managerFeedback = "" + consultationInput.managerFeedback;
              consultationInputObj.feedbackPhase = consultationInput.feedbackPhase;
              consultationInputObj.lastEdit = consultationInput.lastEdit;
              consultationInputObj.decline = consultationInput.decline;
              consultationInputObj.valuation = consultationInput.valuation;
              consultationInputObj.feedbackGiven = consultationInput.feedbackGiven;

            }
          },
          error: (error) => {
            this.snckBar.open("Unbekannter Fehler beim Speichern der Rückmeldung", "", {
              duration: 4000
            });
          }
        });
    } else {
      this.consultationService.updateConsultationInput(this.roadWorkActivity.properties.uuid,
        this.consultationInput)
        .subscribe({
          next: (consultationInput) => {
            if (consultationInput) {
              ErrorMessageEvaluation._evaluateErrorMessage(consultationInput);
              if (consultationInput.errorMessage.trim().length !== 0) {
                this.snckBar.open(consultationInput.errorMessage, "", {
                  duration: 4000
                });
              } else {
                this.snckBar.open("Rückmeldung gespeichert", "", {
                  duration: 4000
                });
              }
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

  hasRequirementAlreadyEntered(): boolean {
    for (let needOfActivity of this.needsOfActivity) {
      if (needOfActivity.properties.uuid &&
        needOfActivity.properties.orderer.uuid == this.user.uuid) {
        return true;
      }
    }
    return false;
  }

  createNewNeed() {
    let protoNeed: RoadWorkNeedFeature | undefined;
    for (let needOfActivity of this.needsOfActivity) {
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

  setDecline() {
    if (this.consultationInput.decline) {
      this.consultationInput.valuation = 0;
      this.consultationInput.ordererFeedback = "";
    }
    this.sendInConsult();
  }

}
