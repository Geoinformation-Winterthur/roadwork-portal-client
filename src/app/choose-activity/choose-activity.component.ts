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
import { User } from 'src/model/user';
import { ManagementAreaService } from 'src/services/management-area.service';

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
  chosenActivityYearFrom?: number;

  statusFilterCodes: string[] = ["review", "inconsult", "verified", "reporting", "coordinated"];

  tableDisplayedColumns: string[] = ['title', 'status', 'area_man', 'project_man', 'lead',
    'realisation_date', 'due_date', 'actions', 'link_cityplan', 'link_wwg',
    'relevance', 'relevance_sks'];

  user: User = new User();
  userService: UserService;

  private roadWorkActivityService: RoadWorkActivityService;
  private managementAreaService: ManagementAreaService;
  private snckBar: MatSnackBar;

  constructor(roadWorkActivityService: RoadWorkActivityService,
    userService: UserService, managementAreaService: ManagementAreaService,
    snckBar: MatSnackBar) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.managementAreaService = managementAreaService;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.getAllActivities();

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

  getAllActivities() {

    this.roadWorkActivityService.getRoadWorkActivities().subscribe({
      next: (roadWorkActivities) => {

        for (let roadWorkActivity of roadWorkActivities) {
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = roadWorkActivity.geometry.coordinates;
          roadWorkActivity.geometry = blowUpPoly;
          this.managementAreaService.getIntersectingManagementAreas(roadWorkActivity.geometry)
            .subscribe({
              next: (managementAreas) => {
                if (roadWorkActivity && managementAreas && managementAreas.length !== 0) {
                  roadWorkActivity.properties.areaManager = managementAreas[0].manager;
                  roadWorkActivity.properties.evaluation = 0;
                  roadWorkActivity.properties.evaluationSks = 0;
                }
              },
              error: (error) => {
              }
            });
        }

        this.roadWorkActivityFeatures = roadWorkActivities;
        this.filterActivities();
      },
      error: (error) => {
      }
    });

  }

  filterActivities() {
    this.roadWorkActivityFeaturesFiltered =
      this.roadWorkActivityFeatures
        .filter(roadWorkActivityFeature => {
          if (roadWorkActivityFeature && roadWorkActivityFeature.properties &&
            roadWorkActivityFeature.properties.name && roadWorkActivityFeature.properties.finishEarlyTo) {
            let roadWorkActivityName: string = this.chosenActivityName.trim().toLowerCase();
            let finishEarlyTo: Date = new Date(roadWorkActivityFeature.properties.finishEarlyTo);
            return (roadWorkActivityName === ''
              || roadWorkActivityFeature.properties.name.trim().toLowerCase().includes(roadWorkActivityName))
              && (!this.chosenActivityYearFrom || finishEarlyTo.getFullYear() === this.chosenActivityYearFrom) &&
              this.statusFilterCodes.includes(roadWorkActivityFeature.properties.status.code);
          } else {
            return false;
          }
        });
  }

}
