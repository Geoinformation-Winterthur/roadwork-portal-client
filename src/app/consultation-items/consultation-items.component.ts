import { Component, Input } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { StatusHelper } from 'src/helper/status-helper';
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
export class ConsultationItemsComponent {

  @Input()
  roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();

  tableDisplayedColumns: string[] = ['name', 'organisation', 'participant', 'feedback', 'date_last_change', 'has_feedback', 'still_requirement', 'temporal_factor', 'new_requirement', 'consult_input'];

  user: User;
  userService: UserService;

  needsOfActivity: RoadWorkNeedFeature[] = [];
  needsOfUser: RoadWorkNeedFeature[] = [];

  statusHelper: StatusHelper;

  decline: boolean = false;
  stillRelevant: boolean = false;

  ordererFeedbackText: string = "";

  private roadWorkNeedService: RoadWorkNeedService;
  private needsOfActivityService: NeedsOfActivityService;
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
          let needsOfUserTemp = [];
          this.stillRelevant = true;
          for (let roadWorkNeed of roadWorkNeeds) {
            needsOfActivityTemp.push(roadWorkNeed);
            if (roadWorkNeed.properties.orderer.uuid == this.user.uuid)
              needsOfUserTemp.push(roadWorkNeed);
            if(!roadWorkNeed.properties.stillRelevant){
              this.stillRelevant = false;
            }
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
          this.needsOfUser = needsOfUserTemp;
        },
        error: (error) => {
        }
      });


    if (this.roadWorkActivity.properties.uuid) {
      this.needsOfActivityService.updateIntersectingRoadWorkNeeds(this.roadWorkActivity.properties.uuid, this.needsOfActivity);
    }


  }

  saveNeedsOfUser() {    
    if(this.stillRelevant)
      this.decline = false;

    let messageShown: boolean = false;
    for (let needOfUser of this.needsOfUser) {
      needOfUser.properties.stillRelevant = this.stillRelevant;
      needOfUser.properties.feedbackGiven = true;
      needOfUser.properties.comment = this.ordererFeedbackText;
      this.roadWorkNeedService
        .updateRoadWorkNeed(needOfUser)
        .subscribe({
          next: (roadWorkNeedFeature) => {
            if (roadWorkNeedFeature) {
              ErrorMessageEvaluation._evaluateErrorMessage(roadWorkNeedFeature);
              if (roadWorkNeedFeature.errorMessage !== "") {
                if(!messageShown){
                  this.snckBar.open(roadWorkNeedFeature.errorMessage, "", {
                    duration: 4000
                  });
                  messageShown = true;
                }
              } else {
                if(!messageShown){
                  this.snckBar.open("Rückmeldung gespeichert", "", {
                    duration: 4000
                  });
                  messageShown = true;
                }
              }
            }
          },
          error: (error) => {
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

}
