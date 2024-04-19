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
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-choose-need',
  templateUrl: './choose-need.component.html',
  styleUrls: ['./choose-need.component.css']
})
export class ChooseNeedComponent implements OnInit {

  roadWorkNeedFeatures: RoadWorkNeedFeature[] = [];

  filterPanelOpen: boolean = false;
  showAsList: boolean = false;

  chosenNeedName: string = "";
  chosenNeedYearOptFrom?: number;

  userService: UserService;

  statusFilterCodes: string[] = ["requirement"];

  tableDisplayedColumns: string[] = ['title', 'kind', 'status', 'link_cityplan', 'link_wwg', 'link_roadworkactivity', 'actions'];

  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;
  private snckBar: MatSnackBar;
  private dialog: MatDialog;
  private router: Router;

  constructor(roadWorkNeedService: RoadWorkNeedService, userService: UserService,
    roadWorkActivityService: RoadWorkActivityService, router: Router,
      snckBar: MatSnackBar, dialog: MatDialog) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.router = router;
    this.snckBar = snckBar;
    this.dialog = dialog;
  }

  ngOnInit(): void {
    this.getNeedsWithFilter();
  }

  getNeedsWithFilter() {
    let roadWorkNeedName: string = this.chosenNeedName.trim().toLowerCase();

    this.roadWorkNeedService
          .getRoadWorkNeeds([], this.chosenNeedYearOptFrom,
              roadWorkNeedName, this.statusFilterCodes)
              .subscribe({
      next: (roadWorkNeeds) => {

        for (let roadWorkNeed of roadWorkNeeds) {
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = roadWorkNeed.geometry.coordinates;
          roadWorkNeed.geometry = blowUpPoly;
        }

        this.roadWorkNeedFeatures = roadWorkNeeds;
      },
      error: (error) => {
      }
    });

  }

  createNewActivityFromNeed(roadWorkNeed: RoadWorkNeedFeature) {
    let roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();
    roadWorkActivity.geometry = roadWorkNeed.geometry;
    roadWorkActivity.properties.name = roadWorkNeed.properties.name;
    roadWorkActivity.properties.roadWorkNeedsUuids.push(roadWorkNeed.properties.uuid);
    roadWorkActivity.properties.costsType.code = "valuation";
    roadWorkActivity.properties.costs = roadWorkNeed.properties.costs;
    roadWorkActivity.properties.finishTo = roadWorkNeed.properties.finishOptimumTo;

    this.roadWorkActivityService.addRoadworkActivity(roadWorkActivity)
      .subscribe({
        next: (roadWorkActivityFeature) => {
          ErrorMessageEvaluation._evaluateErrorMessage(roadWorkActivityFeature);
          if (roadWorkActivityFeature.errorMessage.trim().length !== 0) {
            this.snckBar.open(roadWorkActivityFeature.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.router.navigate(["/activities/" + roadWorkActivityFeature.properties.uuid]);
            this.snckBar.open("Vorhaben wurde erstellt", "", {
              duration: 4000,
            });
          }
        },
        error: (error) => {
        }
      });
  }

}
