import { Component, OnChanges } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';

@Component({
  selector: 'app-needs-of-activity',
  templateUrl: './needs-of-activity.component.html',
  styleUrls: ['./needs-of-activity.component.css']
})
export class NeedsOfActivityComponent {

  displayedColumns: string[] = ['name', 'orderer', 'dateCreated', 'optRealYears', 'action'];

  public roadWorkActivityFeature: RoadWorkActivityFeature;

  public needsOfActivityService: NeedsOfActivityService;

  private roadWorkNeedService: RoadWorkNeedService;
  private snckBar: MatSnackBar;

  constructor(roadWorkNeedService: RoadWorkNeedService,
    needsOfActivityService: NeedsOfActivityService,
    snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.roadWorkActivityFeature = needsOfActivityService.roadWorkActivityFeature;
    this.snckBar = snckBar;
  }

  assignRoadWorkNeed(roadWorkNeed: RoadWorkNeedFeature) {
    let originalActivityRelationType: string = roadWorkNeed.properties.activityRelationType;
    roadWorkNeed.properties.activityRelationType = "assignedneed";
    roadWorkNeed.properties.roadWorkActivityUuid = this.roadWorkActivityFeature.properties.uuid;
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
                    .filter((roadWorkNeed) => roadWorkNeed.properties.uuid !== roadWorkNeed.properties.uuid);
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
    let originalActivityUuid: string = roadWorkNeed.properties.roadWorkActivityUuid;
    roadWorkNeed.properties.roadWorkActivityUuid = "";
    roadWorkNeed.properties.activityRelationType = "nonassignedneed";
    this.roadWorkNeedService.updateRoadWorkNeed(roadWorkNeed)
      .subscribe({
        next: (errorMessage) => {
          if (errorMessage != null && errorMessage.errorMessage != null &&
                errorMessage.errorMessage.trim().length !== 0) {
            roadWorkNeed.properties.activityRelationType = originalActivityRelationType;
            roadWorkNeed.properties.roadWorkActivityUuid = originalActivityUuid;      
            ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
            this.snckBar.open(errorMessage.errorMessage, "", {
              duration: 4000
            });
          } else {
            let nonAssignedRoadWorkNeeds: RoadWorkNeedFeature[] 
                    = this.needsOfActivityService.nonAssignedRoadWorkNeeds.filter(() => true);
            let releasedRoadWorkNeed: RoadWorkNeedFeature = this.needsOfActivityService
                  .assignedRoadWorkNeeds
                    .find(roadWorkNeed => roadWorkNeed.properties.uuid === roadWorkNeed.properties.uuid) as RoadWorkNeedFeature;
            this.needsOfActivityService.assignedRoadWorkNeeds = 
                this.needsOfActivityService.assignedRoadWorkNeeds
                    .filter((roadWorkNeed) => roadWorkNeed.properties.uuid !== roadWorkNeed.properties.uuid);
            nonAssignedRoadWorkNeeds.push(releasedRoadWorkNeed);
            this.needsOfActivityService.nonAssignedRoadWorkNeeds = nonAssignedRoadWorkNeeds;
          }
        },
        error: (error) => {
        }
      });
  }

  registerRoadWorkNeed(roadWorkNeedUuid: string) {
    this.roadWorkNeedService.deleteRoadWorkNeed(roadWorkNeedUuid, true)
      .subscribe({
        next: (errorMessage) => {
          if (errorMessage != null && errorMessage.errorMessage != null &&
                errorMessage.errorMessage.trim().length !== 0) {
            ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
            this.snckBar.open(errorMessage.errorMessage, "", {
              duration: 4000
            });
          } else {
            let nonAssignedRoadWorkNeeds: RoadWorkNeedFeature[] 
                    = this.needsOfActivityService.nonAssignedRoadWorkNeeds.filter(() => true);
            let releasedRoadWorkNeed: RoadWorkNeedFeature = this.needsOfActivityService
                  .assignedRoadWorkNeeds
                    .find(roadWorkNeed => roadWorkNeed.properties.uuid === roadWorkNeedUuid) as RoadWorkNeedFeature;
            this.needsOfActivityService.assignedRoadWorkNeeds = 
                this.needsOfActivityService.assignedRoadWorkNeeds
                    .filter((roadWorkNeed) => roadWorkNeed.properties.uuid !== roadWorkNeedUuid);
            nonAssignedRoadWorkNeeds.push(releasedRoadWorkNeed);
            this.needsOfActivityService.nonAssignedRoadWorkNeeds = nonAssignedRoadWorkNeeds;
          }
        },
        error: (error) => {
        }
      });
  }

}
