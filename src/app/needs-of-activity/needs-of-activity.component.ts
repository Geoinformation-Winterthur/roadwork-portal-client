import { Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';

@Component({
  selector: 'app-needs-of-activity',
  templateUrl: './needs-of-activity.component.html',
  styleUrls: ['./needs-of-activity.component.css']
})
export class NeedsOfActivityComponent {

  assignedActColumns: string[] = ['name', 'reason', 'orderer', 'org', 'optRealYears', 'isOrigin', 'dateCreated', 'action'];
  nonAssignedActColumns: string[] = ['name', 'reason', 'orderer', 'org', 'optRealYears', 'dateCreated', 'action'];

  @Input()
  roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();

  @Input()
  isInEditingMode: boolean = false;

  needsOfActivityService: NeedsOfActivityService;
  userService: UserService;

  allRoadWorkNeedFeatures: RoadWorkNeedFeature[] = [];
  searchResultRoadWorkNeedFeatures: RoadWorkNeedFeature[] = [];

  roadWorkNeedSearchControl: FormControl = new FormControl();

  searchSliderMin: number = new Date().getFullYear() - 10;
  searchSliderMax: number = new Date().getFullYear() + 30;
  searchSliderStep: number = 1;
  searchSliderThumbLabel: boolean = true;

  private roadWorkNeedService: RoadWorkNeedService;
  private snckBar: MatSnackBar;

  constructor(roadWorkNeedService: RoadWorkNeedService,
    needsOfActivityService: NeedsOfActivityService,
    userService: UserService,
    snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.snckBar = snckBar;
    this.userService = userService;
  }

  ngOnInit(): void {
    this.roadWorkNeedService.getRoadWorkNeeds([], undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      this.roadWorkActivity.properties.uuid).subscribe({
        next: (roadWorkNeeds) => {
          this.allRoadWorkNeedFeatures = roadWorkNeeds;
          if (this.needsOfActivityService.assignedRoadWorkNeeds.length != 0) {
            this.allRoadWorkNeedFeatures =
              this.allRoadWorkNeedFeatures
                .filter((roadWorkNeed) => this.needsOfActivityService.assignedRoadWorkNeeds.some(assignedNeed => assignedNeed.properties.uuid !== roadWorkNeed.properties.uuid));
          }
          if (this.needsOfActivityService.registeredRoadWorkNeeds.length != 0) {
            this.allRoadWorkNeedFeatures =
              this.allRoadWorkNeedFeatures
                .filter((roadWorkNeed) => this.needsOfActivityService.registeredRoadWorkNeeds.some(registeredNeed => registeredNeed.properties.uuid !== roadWorkNeed.properties.uuid));
          }

        },
        error: (error) => {
        }
      });
    if (this.roadWorkActivity.properties.uuid) {
      this.needsOfActivityService.updateIntersectingRoadWorkNeeds(this.roadWorkActivity.properties.uuid, this.allRoadWorkNeedFeatures);
    }
  }

  assignRoadWorkNeed(roadWorkNeed: RoadWorkNeedFeature) {
    let originalActivityRelationType: string = roadWorkNeed.properties.activityRelationType;
    roadWorkNeed.properties.activityRelationType = "assignedneed";
    roadWorkNeed.properties.roadWorkActivityUuid = this.roadWorkActivity.properties.uuid as string;
    let isFirstNeed: boolean = false;
    if(this.needsOfActivityService.assignedRoadWorkNeeds &&
        this.needsOfActivityService.assignedRoadWorkNeeds.length == 0)
          isFirstNeed = true;

    this.roadWorkNeedService.updateRoadWorkNeed(roadWorkNeed)
      .subscribe({
        next: (errorMessage) => {
          if (errorMessage != null && errorMessage.errorMessage != null &&
            errorMessage.errorMessage.trim().length !== 0) {
            roadWorkNeed.properties.activityRelationType = originalActivityRelationType;
            roadWorkNeed.properties.roadWorkActivityUuid = "";
            ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
            this.snckBar.open(errorMessage.errorMessage, "", {
              duration: 4000
            });
          } else {
            let assignedRoadWorkNeeds: RoadWorkNeedFeature[]
              = this.needsOfActivityService.assignedRoadWorkNeeds.filter(() => true);
            this.needsOfActivityService.nonAssignedRoadWorkNeeds =
              this.needsOfActivityService.nonAssignedRoadWorkNeeds
                .filter((roadWorkNeedIt) => roadWorkNeedIt.properties.uuid !== roadWorkNeed.properties.uuid);
            this.needsOfActivityService.registeredRoadWorkNeeds =
              this.needsOfActivityService.registeredRoadWorkNeeds
                .filter((roadWorkNeedIt) => roadWorkNeedIt.properties.uuid !== roadWorkNeed.properties.uuid);
            assignedRoadWorkNeeds.push(roadWorkNeed);
            this.needsOfActivityService.assignedRoadWorkNeeds = assignedRoadWorkNeeds;
            if(isFirstNeed)
              this.setAsPrimaryNeed(roadWorkNeed);
          }
        },
        error: (error) => {
        }
      });
  }

  unAssignRoadWorkNeed(roadWorkNeed: RoadWorkNeedFeature) {
    let originalActivityRelationType: string = roadWorkNeed.properties.activityRelationType;

    this.roadWorkNeedService.deleteRoadWorkNeed(roadWorkNeed.properties.uuid, true)
      .subscribe({
        next: (errorMessage) => {
          if (errorMessage != null && errorMessage.errorMessage != null &&
            errorMessage.errorMessage.trim().length !== 0) {
            roadWorkNeed.properties.activityRelationType = originalActivityRelationType;
            ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
            this.snckBar.open(errorMessage.errorMessage, "", {
              duration: 4000
            });
          } else {
            roadWorkNeed.properties.activityRelationType = "";
            this.needsOfActivityService.assignedRoadWorkNeeds =
              this.needsOfActivityService.assignedRoadWorkNeeds
                .filter((roadWorkNeedIt) => roadWorkNeedIt.properties.uuid !== roadWorkNeed.properties.uuid);
            this.allRoadWorkNeedFeatures.push(roadWorkNeed);

            if(roadWorkNeed.properties.isPrimary){
              for (let assignedRoadWorkNeed of this.needsOfActivityService.assignedRoadWorkNeeds) {
                if (assignedRoadWorkNeed.properties.uuid != roadWorkNeed.properties.uuid) {
                  this.setAsPrimaryNeed(assignedRoadWorkNeed);
                  break;
                }
              }  
            }        

            if (this.roadWorkActivity.properties.uuid) {
              this.needsOfActivityService.updateIntersectingRoadWorkNeeds(this.roadWorkActivity.properties.uuid);
            }
          }
        },
        error: (error) => {
          this.snckBar.open("Unbekannter Fehler", "", {
            duration: 4000
          });
        }
      });
  }

  setAsPrimaryNeed(roadWorkNeed: RoadWorkNeedFeature) {
    for (let assignedRoadWorkNeed of this.needsOfActivityService.assignedRoadWorkNeeds) {
      if (assignedRoadWorkNeed.properties.uuid == roadWorkNeed.properties.uuid) {
        if (!assignedRoadWorkNeed.properties.isPrimary) {
          assignedRoadWorkNeed.properties.isPrimary = true;
          this.roadWorkNeedService
            .updateRoadWorkNeed(assignedRoadWorkNeed)
            .subscribe({
              next: (roadWorkNeedFeature) => {
              },
              error: (error) => {
              }
            });
        }
      } else {
        if (assignedRoadWorkNeed.properties.isPrimary == true) {
          assignedRoadWorkNeed.properties.isPrimary = false;
          this.roadWorkNeedService
            .updateRoadWorkNeed(assignedRoadWorkNeed)
            .subscribe({
              next: (roadWorkNeedFeature) => {
              },
              error: (error) => {
              }
            });
        }
      }
    }
  }

  registerRoadWorkNeed(roadWorkNeed: RoadWorkNeedFeature) {
    let originalActivityRelationType: string = roadWorkNeed.properties.activityRelationType;
    roadWorkNeed.properties.activityRelationType = "registeredneed";
    roadWorkNeed.properties.roadWorkActivityUuid = this.roadWorkActivity.properties.uuid as string;
    this.roadWorkNeedService.updateRoadWorkNeed(roadWorkNeed)
      .subscribe({
        next: (errorMessage) => {
          if (errorMessage != null && errorMessage.errorMessage != null &&
            errorMessage.errorMessage.trim().length !== 0) {
            roadWorkNeed.properties.activityRelationType = originalActivityRelationType;
            roadWorkNeed.properties.roadWorkActivityUuid = "";
            ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
            this.snckBar.open(errorMessage.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.searchResultRoadWorkNeedFeatures = [];
            let registeredRoadWorkNeedsCopy: RoadWorkNeedFeature[]
              = this.needsOfActivityService.registeredRoadWorkNeeds.filter(() => true);
            this.allRoadWorkNeedFeatures =
              this.allRoadWorkNeedFeatures
                .filter((roadWorkNeedIt) => roadWorkNeedIt.properties.uuid !== roadWorkNeed.properties.uuid);
            registeredRoadWorkNeedsCopy.push(roadWorkNeed);
            this.needsOfActivityService.registeredRoadWorkNeeds = registeredRoadWorkNeedsCopy;
            if (this.roadWorkActivity.properties.uuid) {
              this.needsOfActivityService.updateIntersectingRoadWorkNeeds(this.roadWorkActivity.properties.uuid);
            }
          }
        },
        error: (error) => {
        }
      });
  }

  deRegisterRoadWorkNeed(roadWorkNeed: RoadWorkNeedFeature) {
    let originalActivityRelationType: string = roadWorkNeed.properties.activityRelationType;
    roadWorkNeed.properties.activityRelationType = "";
    roadWorkNeed.properties.roadWorkActivityUuid = this.roadWorkActivity.properties.uuid as string;
    this.roadWorkNeedService.updateRoadWorkNeed(roadWorkNeed)
      .subscribe({
        next: (errorMessage) => {
          if (errorMessage != null && errorMessage.errorMessage != null &&
            errorMessage.errorMessage.trim().length !== 0) {
            roadWorkNeed.properties.activityRelationType = originalActivityRelationType;
            roadWorkNeed.properties.roadWorkActivityUuid = "";
            ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
            this.snckBar.open(errorMessage.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.searchResultRoadWorkNeedFeatures = [];
            this.needsOfActivityService.registeredRoadWorkNeeds =
              this.needsOfActivityService.registeredRoadWorkNeeds
                .filter((roadWorkNeedIt) => roadWorkNeedIt.properties.uuid !== roadWorkNeed.properties.uuid);
            this.allRoadWorkNeedFeatures.push(roadWorkNeed);
            if (this.roadWorkActivity.properties.uuid) {
              this.needsOfActivityService.updateIntersectingRoadWorkNeeds(this.roadWorkActivity.properties.uuid);
            }
          }
        },
        error: (error) => {
        }
      });
  }

  searchRoadWorkNeeds() {
    this.searchResultRoadWorkNeedFeatures =
      this.allRoadWorkNeedFeatures
        .filter(roadWorkNeedFeature => {
          if (roadWorkNeedFeature.properties && roadWorkNeedFeature.properties.name
            && roadWorkNeedFeature.properties.status) {
            let roadWorkNeedNameToSeaarch: string = "";
            if (this.roadWorkNeedSearchControl.value)
              roadWorkNeedNameToSeaarch = this.roadWorkNeedSearchControl.value.trim().toLowerCase();
            let roadWorkNeedName: string = roadWorkNeedFeature.properties.name.trim().toLowerCase();
            let isNameEqual: boolean = roadWorkNeedName.includes(roadWorkNeedNameToSeaarch);
            let isPrivate: boolean = roadWorkNeedFeature.properties.isPrivate;
            let isAlive: boolean = roadWorkNeedFeature.properties.status !== "coordinated" &&
              roadWorkNeedFeature.properties.status !== "suspended";
            return (roadWorkNeedNameToSeaarch === '' || isNameEqual) && !isPrivate && isAlive;
          } else {
            return false;
          }
        });
  }

}
