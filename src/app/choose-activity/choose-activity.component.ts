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
import { UserService } from 'src/services/user.service';

@Component({
  selector: 'app-choose-activity',
  templateUrl: './choose-activity.component.html',
  styleUrls: ['./choose-activity.component.css']
})
export class ChooseActivityComponent implements OnInit {

  roadWorkActivityFeatures: RoadWorkActivityFeature[] = [];
  roadWorkActivityFeaturesFiltered: RoadWorkActivityFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenActivityName: string = "";
  chosenActivityYearFrom: number = new Date().getFullYear();

  userService: UserService;

  private roadWorkActivityService: RoadWorkActivityService;
  private snckBar: MatSnackBar;

  constructor(roadWorkActivityService: RoadWorkActivityService,
    userService: UserService,
    snckBar: MatSnackBar) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.getAllActivities();
  }

  getAllActivities() {

    this.roadWorkActivityService.getRoadWorkActivities().subscribe({
      next: (roadWorkActivities) => {

        for (let roadWorkActivity of roadWorkActivities) {
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = roadWorkActivity.geometry.coordinates;
          roadWorkActivity.geometry = blowUpPoly;
        }

        this.roadWorkActivityFeatures = roadWorkActivities;
        this.filterActivities();
      },
      error: (error) => {
      }
    });

  }

  deleteRoadworkActivity(uuid: string) {
    this.roadWorkActivityService.deleteRoadWorkActivity(uuid).subscribe({
      next: (errorMessage) => {
        if (errorMessage != null && errorMessage.errorMessage != null &&
          errorMessage.errorMessage.trim().length !== 0) {
          ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
          this.snckBar.open(errorMessage.errorMessage, "", {
            duration: 4000
          });
        } else {
          this.roadWorkActivityFeatures = this.roadWorkActivityFeatures
            .filter((roadWorkActivityFeature) => uuid !== roadWorkActivityFeature.properties.uuid);
          this.roadWorkActivityFeaturesFiltered = this.roadWorkActivityFeaturesFiltered
            .filter((roadWorkActivityFeature) => uuid !== roadWorkActivityFeature.properties.uuid);
        }
      },
      error: (error) => {
      }
    });
  }

  filterActivities() {
    this.roadWorkActivityFeaturesFiltered =
      this.roadWorkActivityFeatures
        .filter(roadWorkActivityFeature => {
          if (roadWorkActivityFeature.properties && roadWorkActivityFeature.properties.name
            && roadWorkActivityFeature.properties.finishFrom) {
            let roadWorkActivityName: string = this.chosenActivityName.trim().toLowerCase();
            let finishFrom: Date = new Date(roadWorkActivityFeature.properties.finishFrom);
            return (roadWorkActivityName === ''
              || roadWorkActivityFeature.properties.name.trim().toLowerCase().includes(roadWorkActivityName))
              && finishFrom.getFullYear() === this.chosenActivityYearFrom;
          } else {
            return false;
          }
        });
  }

}
