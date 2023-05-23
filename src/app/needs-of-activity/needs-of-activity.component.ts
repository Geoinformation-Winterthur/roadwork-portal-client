import { ChangeDetectorRef, Component, Input, OnChanges, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';

@Component({
  selector: 'app-needs-of-activity',
  templateUrl: './needs-of-activity.component.html',
  styleUrls: ['./needs-of-activity.component.css']
})
export class NeedsOfActivityComponent implements OnChanges {

  @Input() roadWorkNeeds: RoadWorkNeedFeature[] = [];

  displayedColumns: string[] = ['name', 'orderer', 'dateCreated', 'deleteAction'];

  private roadWorkNeedService: RoadWorkNeedService;

  private snckBar: MatSnackBar;

  constructor(roadWorkNeedService: RoadWorkNeedService, snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.snckBar = snckBar;
  }

  ngOnChanges() {
    // hard-trigger UI update by Angular (does not work):
    let roadWorkNeedsCopy = this.roadWorkNeeds.map((x) => x);
    this.roadWorkNeeds = roadWorkNeedsCopy;
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
                let roadWorkNeedsCopy = this.roadWorkNeeds.map((x) => x);
                roadWorkNeedsCopy.splice(i, 1);
                this.roadWorkNeeds = roadWorkNeedsCopy;
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
