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
import { User } from 'src/model/user';
import { ManagementAreaService } from 'src/services/management-area.service';

@Component({
  selector: 'app-choose-need',
  templateUrl: './choose-need.component.html',
  styleUrls: ['./choose-need.component.css']
})
export class ChooseNeedComponent implements OnInit {

  roadWorkNeedFeatures: RoadWorkNeedFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenNeedName: string = "";
  chosenNeedYearOptFrom?: number;

  user: User = new User();

  statusFilterCodes: string[] = ["requirement"];

  tableDisplayedColumns: string[] = ['title', 'status', 'areaman', 'create_date', 'due_date', 'actions', 'link_cityplan', 'link_wwg', 'priority'];

  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;
  private managementAreaService: ManagementAreaService;
  private snckBar: MatSnackBar;
  private router: Router;
  private userService: UserService;

  constructor(roadWorkNeedService: RoadWorkNeedService, userService: UserService,
      roadWorkActivityService: RoadWorkActivityService, router: Router,
      managementAreaService: ManagementAreaService, snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
    this.managementAreaService = managementAreaService;
    this.userService = userService;
    this.router = router;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.getNeedsWithFilter();

    this.userService.getUser(this.userService.getLocalUser().mailAddress)
    .subscribe({
      next: (users) => {
        if (users && users.length > 0 && users[0]) {
          let user: User = users[0];
          ErrorMessageEvaluation._evaluateErrorMessage(user);
          if (user && user.errorMessage &&
            user.errorMessage.trim().length !== 0) {
            this.snckBar.open(user.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.user = user;
          }
        }
      },
      error: (error) => {
        this.snckBar.open("Beim Laden von Benutzerdaten ist ein Systemfehler aufgetreten. Bitte wenden Sie sich an den Administrator.", "", {
          duration: 4000
        });
      }
    });

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
          this.managementAreaService.getIntersectingManagementAreas(roadWorkNeed.geometry)
          .subscribe({
            next: (managementAreas) => {
              if (roadWorkNeed && managementAreas && managementAreas.length !== 0) {
                roadWorkNeed.properties.managementArea = managementAreas[0];
              }
            },
            error: (error) => {
            }
          });
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
