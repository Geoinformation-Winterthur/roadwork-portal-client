import { Component, OnChanges } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';

@Component({
  selector: 'app-needs-of-activity',
  templateUrl: './needs-of-activity.component.html',
  styleUrls: ['./needs-of-activity.component.css']
})
export class NeedsOfActivityComponent {

  displayedColumns: string[] = ['name', 'orderer', 'dateCreated', 'deleteAction'];

  public needsOfActivityService: NeedsOfActivityService;

  private roadWorkNeedService: RoadWorkNeedService;
  private snckBar: MatSnackBar;

  constructor(roadWorkNeedService: RoadWorkNeedService,
    needsOfActivityService: NeedsOfActivityService,
    snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.snckBar = snckBar;
  }

  releaseRoadWorkNeed(roadWorkNeedUuid: string) {
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
            this.needsOfActivityService.roadWorkNeeds = 
                this.needsOfActivityService.roadWorkNeeds
                    .filter((roadWorkNeed) => roadWorkNeed.properties.uuid !== roadWorkNeedUuid);
          }
        },
        error: (error) => {
        }
      });
  }

}
