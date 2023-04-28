/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkActivityFeature } from '../../model/road-work-activity-feature';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-choose-activity',
  templateUrl: './choose-activity.component.html',
  styleUrls: ['./choose-activity.component.css']
})
export class ChooseActivityComponent implements OnInit {

  roadWorkActivityFeatures: RoadWorkActivityFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenYear: number = new Date().getFullYear();

  private roadWorkActivityService: RoadWorkActivityService;
  private snckBar: MatSnackBar;

  constructor(roadWorkActivityService: RoadWorkActivityService,
          snckBar: MatSnackBar) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.getAllActivities();
  }

  getAllActivities() {

    this.roadWorkActivityService.getRoadWorkActivities().subscribe({
      next: (roadWorkActivities) => {

        for(let roadWorkActivity of roadWorkActivities){
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = roadWorkActivity.geometry.coordinates;
          roadWorkActivity.geometry = blowUpPoly;
        }

        this.roadWorkActivityFeatures = roadWorkActivities;
      },
      error: (error) => {
      }
    });

  }

  deleteRoadworkActivity(uuid: string){
    this.roadWorkActivityService.deleteRoadWorkActivity(uuid).subscribe({
      next: (errorMessage) => {
        if(errorMessage != null && errorMessage.errorMessage.trim().length !== 0)
        {
          ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
          this.snckBar.open(errorMessage.errorMessage, "", {
            duration: 4000
          });
        } else {
                this.roadWorkActivityFeatures.filter((roadWorkActivity: RoadWorkActivityFeature,
                  index: number, featuresArray: RoadWorkActivityFeature[]) => {
            if(roadWorkActivity.properties.uuid === uuid){
              featuresArray.splice(index, 1);
              return true;
            }
            return false;
          });
        }
      },
      error: (error) => {
      }
    });
  }

}
