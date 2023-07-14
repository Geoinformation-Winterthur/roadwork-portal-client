/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-choose-need',
  templateUrl: './choose-need.component.html',
  styleUrls: ['./choose-need.component.css']
})
export class ChooseNeedComponent implements OnInit {

  roadWorkNeedFeatures: RoadWorkNeedFeature[] = [];
  roadWorkNeedFeaturesFiltered: RoadWorkNeedFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenNeedName: string = "";
  chosenNeedYearOptFrom: number = new Date().getFullYear();

  userService: UserService;

  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;
  private snckBar: MatSnackBar;
  private router: Router;

  constructor(roadWorkNeedService: RoadWorkNeedService, userService: UserService,
    roadWorkActivityService: RoadWorkActivityService, router: Router,
      snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.router = router;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.getAllNeeds();
  }

  getAllNeeds() {

    this.roadWorkNeedService.getRoadWorkNeeds().subscribe({
      next: (roadWorkNeeds) => {

        for (let roadWorkNeed of roadWorkNeeds) {
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = roadWorkNeed.geometry.coordinates;
          roadWorkNeed.geometry = blowUpPoly;
        }

        this.roadWorkNeedFeatures = roadWorkNeeds;
        this.filterNeeds();
      },
      error: (error) => {
      }
    });

  }

  createNewActivityFromNeed(roadWorkNeed: RoadWorkNeedFeature) {
    let roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();
    roadWorkActivity.geometry = roadWorkNeed.geometry;
    roadWorkActivity.properties.name = roadWorkNeed.properties.name;
    roadWorkActivity.properties.managementarea = roadWorkNeed.properties.managementarea;
    roadWorkActivity.properties.roadWorkNeedsUuids.push(roadWorkNeed.properties.uuid);

    this.roadWorkActivityService.addRoadworkActivity(roadWorkActivity)
      .subscribe({
        next: (roadWorkActivityFeature) => {
          this.router.navigate(["/activities/" + roadWorkActivityFeature.properties.uuid]);
        },
        error: (error) => {
        }
      });
  }

  filterNeeds() {
    this.roadWorkNeedFeaturesFiltered =
      this.roadWorkNeedFeatures
        .filter(roadWorkNeedFeature => {
          if (roadWorkNeedFeature.properties && roadWorkNeedFeature.properties.name
            && roadWorkNeedFeature.properties.finishOptimumFrom) {
            let roadWorkNeedName: string = this.chosenNeedName.trim().toLowerCase();
            let finishOptimumFrom: Date = new Date(roadWorkNeedFeature.properties.finishOptimumFrom);
            return (roadWorkNeedName === ''
              || roadWorkNeedFeature.properties.name.trim().toLowerCase().includes(roadWorkNeedName))
              && finishOptimumFrom.getFullYear() === this.chosenNeedYearOptFrom;
          } else {
            return false;
          }
        });
  }

  delete(uuid: string) {
    this.roadWorkNeedService.deleteRoadWorkNeed(uuid)
      .subscribe({
        next: (errorMessage) => {
          ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
          if (errorMessage && errorMessage.errorMessage &&
                errorMessage.errorMessage.trim().length !== 0) {
            this.snckBar.open(errorMessage.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.roadWorkNeedFeatures = this.roadWorkNeedFeatures
              .filter((roadWorkNeedFeature) => uuid !== roadWorkNeedFeature.properties.uuid);
            this.roadWorkNeedFeaturesFiltered = this.roadWorkNeedFeaturesFiltered
              .filter((roadWorkNeedFeature) => uuid !== roadWorkNeedFeature.properties.uuid);
          }
        },
        error: (error) => {
        }
      });
  }

}
