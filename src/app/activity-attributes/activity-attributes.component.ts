/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserService } from 'src/services/user.service';
import { User } from 'src/model/user';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { FormControl } from '@angular/forms';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { ManagementArea } from 'src/model/management-area';
import { ManagementAreaService } from 'src/services/management-area.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';

@Component({
  selector: 'app-activity-attributes',
  templateUrl: './activity-attributes.component.html',
  styleUrls: ['./activity-attributes.component.css']
})
export class ActivityAttributesComponent implements OnInit {

  roadWorkActivityFeature?: RoadWorkActivityFeature;
  managementArea?: ManagementArea;

  orderer: User = new User();
  ordererOrgUnitName: string = "";
  areaManagerName: string = "";
  statusCode: string = "";
  priorityCode: string = "";

  userService: UserService;

  roadWorkActivityStatusEnumControl: FormControl = new FormControl();

  needsOfActivityService: NeedsOfActivityService;
  roadworkNeedsOnMap: RoadWorkNeedFeature[] = [];

  private roadWorkActivityService: RoadWorkActivityService;
  private roadWorkNeedService: RoadWorkNeedService;
  private managementAreaService: ManagementAreaService;
  private activatedRoute: ActivatedRoute;
  private activatedRouteSubscription: Subscription = new Subscription();

  private snckBar: MatSnackBar;

  constructor(activatedRoute: ActivatedRoute, roadWorkActivityService: RoadWorkActivityService,
    needsOfActivityService: NeedsOfActivityService, managementAreaService: ManagementAreaService,
    roadWorkNeedService: RoadWorkNeedService, userService: UserService, snckBar: MatSnackBar) {
    this.activatedRoute = activatedRoute;
    this.roadWorkActivityService = roadWorkActivityService;
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.userService = userService;
    this.managementAreaService = managementAreaService;
    this.snckBar = snckBar;
  }

  ngOnInit() {

    this.needsOfActivityService.assignedRoadWorkNeeds = [];
    this.needsOfActivityService.nonAssignedRoadWorkNeeds = [];
    this.needsOfActivityService.registeredRoadWorkNeeds = [];

    this.activatedRouteSubscription = this.activatedRoute.params
      .subscribe(params => {
        let idParamString: string = params['id'];

        if (idParamString == "new") {

          this.roadWorkActivityFeature = new RoadWorkActivityFeature();
          this.roadWorkActivityFeature.properties.status.code = "inwork";
          this.roadWorkActivityFeature.properties.finishFrom = new Date();
          let plus50Years: Date = new Date();
          plus50Years.setFullYear(plus50Years.getFullYear() + 50);
          this.roadWorkActivityFeature.properties.finishTo = plus50Years;
          this.roadWorkActivityFeature.properties.isEditingAllowed = true;

        } else {

          let constProjId: string = params['id'];

          this.roadWorkActivityService.getRoadWorkActivities(constProjId)
            .subscribe({
              next: (roadWorkActivities) => {
                if (roadWorkActivities.length === 1) {
                  let roadWorkActivity: any = roadWorkActivities[0];
                  let rwPoly: RoadworkPolygon = new RoadworkPolygon();
                  rwPoly.coordinates = roadWorkActivity.geometry.coordinates;
                  roadWorkActivity.geometry = rwPoly;
                  this.roadWorkActivityFeature = roadWorkActivity;

                  let roadWorkActivityFeature: RoadWorkActivityFeature = this.roadWorkActivityFeature as RoadWorkActivityFeature;

                  this.managementAreaService.getIntersectingManagementAreas(roadWorkActivityFeature.geometry)
                    .subscribe({
                      next: (managementAreas) => {
                        if (managementAreas && managementAreas.length !== 0) {
                          this.managementArea = managementAreas[0];
                        }
                      },
                      error: (error) => {
                      }
                    });

                  this.roadWorkActivityStatusEnumControl.setValue(roadWorkActivity.properties.status.code);
                  if (this.roadWorkActivityFeature?.properties.roadWorkNeedsUuids.length !== 0) {
                    this.roadWorkNeedService.getRoadWorkNeeds(this.roadWorkActivityFeature?.properties.roadWorkNeedsUuids)
                      .subscribe({
                        next: (roadWorkNeeds) => {
                          let assignedRoadWorkNeeds: RoadWorkNeedFeature[] = [];
                          let registeredRoadWorkNeeds: RoadWorkNeedFeature[] = [];
                          for (let roadWorkNeed of roadWorkNeeds) {
                            if (roadWorkNeed.properties.activityRelationType === "assignedneed") {
                              assignedRoadWorkNeeds.push(roadWorkNeed);
                            } else if (roadWorkNeed.properties.activityRelationType === "registeredneed") {
                              registeredRoadWorkNeeds.push(roadWorkNeed);
                            }
                          }
                          this.needsOfActivityService.assignedRoadWorkNeeds = assignedRoadWorkNeeds;
                          this.needsOfActivityService.registeredRoadWorkNeeds = registeredRoadWorkNeeds;
                        },
                        error: (error) => {
                        }
                      });
                  }
                }
              },
              error: (error) => {
              }
            });

        }

      });
  }

  add() {
    this.roadWorkActivityService.addRoadworkActivity(this.roadWorkActivityFeature)
      .subscribe({
        next: (roadWorkActivityFeature) => {
          if (this.roadWorkActivityFeature) {
            this.roadWorkActivityFeature = roadWorkActivityFeature;
          }
        },
        error: (error) => {
        }
      });
  }

  update() {
    if (this.roadWorkActivityFeature && this.roadWorkActivityFeature.properties.uuid) {

      this.managementAreaService.getIntersectingManagementAreas(this.roadWorkActivityFeature.geometry)
        .subscribe({
          next: (managementAreas) => {
            if (managementAreas && managementAreas.length !== 0) {
              this.roadWorkActivityService.updateRoadWorkActivity(this.roadWorkActivityFeature)
                .subscribe({
                  next: (roadWorkActivityFeature) => {
                    if (this.roadWorkActivityFeature) {
                      ErrorMessageEvaluation._evaluateErrorMessage(roadWorkActivityFeature);
                      if (roadWorkActivityFeature.errorMessage.trim().length !== 0) {
                        this.snckBar.open(roadWorkActivityFeature.errorMessage, "", {
                          duration: 4000
                        });
                      } else {
                        this.roadWorkActivityFeature = roadWorkActivityFeature;
                        this.managementArea = managementAreas[0];
                        this.snckBar.open("Massnahme ist gespeichert", "", {
                          duration: 4000,
                        });
                      }
                    }
                  },
                  error: (error) => {
                  }
                });
            }
          },
          error: (error) => {
          }
        });
    }
  }

  onRoadWorkActivityStatusEnumChange() {
    if (this.roadWorkActivityFeature && this.roadWorkActivityFeature.properties.uuid) {
      this.roadWorkActivityFeature.properties.status.code = this.roadWorkActivityStatusEnumControl.value;
      this.update();
    }
  }

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
  }

}
