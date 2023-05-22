import { Component, Input, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';

@Component({
  selector: 'app-needs-of-activity',
  templateUrl: './needs-of-activity.component.html',
  styleUrls: ['./needs-of-activity.component.css']
})
export class NeedsOfActivityComponent implements OnInit {

  @Input()
  roadWorkNeedsUuids: string[] = [];

  roadWorkNeeds: RoadWorkNeedFeature[] = [];

  displayedColumns: string[] = ['name', 'orderer', 'dateCreated', 'deleteAction'];

  private roadWorkNeedService: RoadWorkNeedService;

  private snckBar: MatSnackBar;

  constructor(roadWorkNeedService: RoadWorkNeedService, snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    if(this.roadWorkNeedsUuids.length !== 0){
      this.roadWorkNeedService.getRoadWorkNeeds(this.roadWorkNeedsUuids)
      .subscribe({
        next: (roadWorkNeeds) => {
          this.roadWorkNeeds = roadWorkNeeds;
        },
        error: (error) => {
        }
      });
    }
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
            let i: number = 0;
            for (let roadWorkNeed of this.roadWorkNeeds) {
              if(roadWorkNeed.properties.uuid === roadWorkNeedUuid){
                this.roadWorkNeeds = this.roadWorkNeeds.splice(i, 1);
                continue;
              }
              i++;
            }
          }
        },
        error: (error) => {
        }
      });
  }

}
