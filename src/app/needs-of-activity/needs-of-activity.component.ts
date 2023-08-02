import { Component, Input, OnChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { Status } from 'src/model/status';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';

@Component({
  selector: 'app-needs-of-activity',
  templateUrl: './needs-of-activity.component.html',
  styleUrls: ['./needs-of-activity.component.css']
})
export class NeedsOfActivityComponent {

  displayedColumns: string[] = ['name', 'orderer', 'dateCreated', 'optRealYears', 'action'];

  @Input()
  roadWorkActivityUuid?: string;

  @Input()
  isInEditingMode: boolean = false;

  needsOfActivityService: NeedsOfActivityService;

  allRoadWorkNeedFeatures: RoadWorkNeedFeature[] = [];
  searchResultRoadWorkNeedFeatures: RoadWorkNeedFeature[] = [];

  roadWorkNeedSearchControl: FormControl = new FormControl();

  searchSliderMin: number = new Date().getFullYear() - 10;
  searchSliderMax: number = new Date().getFullYear() + 30;
  searchSliderStep: number = 1;
  searchSliderThumbLabel: boolean = true;
  searchNeedYearOptTo: number = new Date().getFullYear();

  private roadWorkNeedService: RoadWorkNeedService;
  private snckBar: MatSnackBar;

  constructor(roadWorkNeedService: RoadWorkNeedService,
    needsOfActivityService: NeedsOfActivityService,
    snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.roadWorkNeedService.getRoadWorkNeeds().subscribe({
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
    if (this.roadWorkActivityUuid) {
      this.needsOfActivityService.updateIntersectingRoadWorkNeeds(this.roadWorkActivityUuid, this.allRoadWorkNeedFeatures);
    }
  }

  assignRoadWorkNeed(roadWorkNeed: RoadWorkNeedFeature) {
    let originalActivityRelationType: string = roadWorkNeed.properties.activityRelationType;
    roadWorkNeed.properties.activityRelationType = "assignedneed";
    let status: Status = new Status();
    status.code = "coordinated";
    roadWorkNeed.properties.status = status;
    roadWorkNeed.properties.roadWorkActivityUuid = this.roadWorkActivityUuid as string;
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
            if (this.roadWorkActivityUuid) {
              this.needsOfActivityService.updateIntersectingRoadWorkNeeds(this.roadWorkActivityUuid);
            }
          }
        },
        error: (error) => {
        }
      });
  }

  registerRoadWorkNeed(roadWorkNeed: RoadWorkNeedFeature) {
    let originalActivityRelationType: string = roadWorkNeed.properties.activityRelationType;
    roadWorkNeed.properties.activityRelationType = "registeredneed";
    roadWorkNeed.properties.roadWorkActivityUuid = this.roadWorkActivityUuid as string;
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
            if (this.roadWorkActivityUuid) {
              this.needsOfActivityService.updateIntersectingRoadWorkNeeds(this.roadWorkActivityUuid);
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
    roadWorkNeed.properties.roadWorkActivityUuid = this.roadWorkActivityUuid as string;
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
            if (this.roadWorkActivityUuid) {
              this.needsOfActivityService.updateIntersectingRoadWorkNeeds(this.roadWorkActivityUuid);
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
            && roadWorkNeedFeature.properties.finishOptimumFrom) {
            let roadWorkNeedName: string = this.roadWorkNeedSearchControl.value.trim().toLowerCase();
            let finishFrom: Date = new Date(roadWorkNeedFeature.properties.finishOptimumFrom);
            return (roadWorkNeedName === ''
              || roadWorkNeedFeature.properties.name.trim().toLowerCase().includes(roadWorkNeedName))
              && finishFrom.getFullYear() === this.searchNeedYearOptTo;
          } else {
            return false;
          }
        });
  }

}
