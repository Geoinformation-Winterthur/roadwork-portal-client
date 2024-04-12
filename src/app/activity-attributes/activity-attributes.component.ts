/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { CostType } from 'src/model/cost-type';
import { OrganisationService } from 'src/services/organisation.service';
import { AppConfigService } from 'src/services/app-config.service';
import { ConfigurationData } from 'src/model/configuration-data';
import { OrganisationalUnit } from 'src/model/organisational-unit';

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
  involvedUsers: User[] = [];

  availableUsers: User[] = [];

  availableCostTypes: CostType[] = [];

  userService: UserService;

  projectManagerControl: FormControl = new FormControl();
  costTypesControl: FormControl = new FormControl();
  roadWorkActivityStatusEnumControl: FormControl = new FormControl();
  roadWorkActivityProjectTypeEnumControl: FormControl = new FormControl();
  finishFromControl: FormControl = new FormControl();
  finishToControl: FormControl = new FormControl();
  dateSksControl: FormControl = new FormControl();
  dateKapControl: FormControl = new FormControl();
  dateOksControl: FormControl = new FormControl();

  needsOfActivityService: NeedsOfActivityService;
  roadworkNeedsOnMap: RoadWorkNeedFeature[] = [];

  configurationData: ConfigurationData = new ConfigurationData();

  private roadWorkActivityService: RoadWorkActivityService;
  private roadWorkNeedService: RoadWorkNeedService;
  private managementAreaService: ManagementAreaService;
  private organisationService: OrganisationService;
  private activatedRoute: ActivatedRoute;
  private router: Router;
  private activatedRouteSubscription: Subscription = new Subscription();
  private appConfigService: AppConfigService;

  private snckBar: MatSnackBar;

  constructor(activatedRoute: ActivatedRoute, roadWorkActivityService: RoadWorkActivityService,
    needsOfActivityService: NeedsOfActivityService, managementAreaService: ManagementAreaService,
    roadWorkNeedService: RoadWorkNeedService, userService: UserService,
    organisationService: OrganisationService, appConfigService: AppConfigService, router: Router,
    snckBar: MatSnackBar) {
    this.activatedRoute = activatedRoute;
    this.roadWorkActivityService = roadWorkActivityService;
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.userService = userService;
    this.managementAreaService = managementAreaService;
    this.organisationService = organisationService;
    this.appConfigService = appConfigService;
    this.router = router;
    this.snckBar = snckBar;
  }

  ngOnInit() {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.availableUsers = users;
      },
      error: (error) => {
      }
    });

    this.appConfigService.getConfigurationData()
      .subscribe({
        next: (configData) => {
          if (configData) {
            ErrorMessageEvaluation._evaluateErrorMessage(configData);
            if (configData.errorMessage !== "") {
              this.snckBar.open(configData.errorMessage, "", {
                duration: 4000
              });
            } else {
              this.configurationData = configData;
            }
          }
        },
        error: (error) => {
        }
      });

    this.roadWorkActivityService.getCostTypes().subscribe({
      next: (costTypes) => {
        this.availableCostTypes = costTypes;
      },
      error: (error) => {
      }
    });

    this.needsOfActivityService.assignedRoadWorkNeeds = [];
    this.needsOfActivityService.nonAssignedRoadWorkNeeds = [];
    this.needsOfActivityService.registeredRoadWorkNeeds = [];

    this.activatedRouteSubscription = this.activatedRoute.params
      .subscribe(params => {
        let idParamString: string = params['id'];

        if (idParamString == "new") {

          this.roadWorkActivityFeature = new RoadWorkActivityFeature();
          this.roadWorkActivityFeature.properties.status.code = "review";
          this.roadWorkActivityFeature.properties.finishFrom = new Date();
          let plus50Years: Date = new Date();
          plus50Years.setFullYear(plus50Years.getFullYear() + 50);
          this.roadWorkActivityFeature.properties.finishTo = plus50Years;
          this.roadWorkActivityFeature.properties.costsType.code = "valuation";
          this.roadWorkActivityFeature.properties.isEditingAllowed = true;
          this.roadWorkActivityFeature.properties.created = new Date();
          this.roadWorkActivityFeature.properties.lastModified = new Date();

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
                  if (roadWorkActivityFeature.properties.costs == 0)
                    roadWorkActivityFeature.properties.costs = undefined;
                  if (roadWorkActivityFeature.properties.investmentNo == 0)
                    roadWorkActivityFeature.properties.investmentNo = undefined;

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
                  this.roadWorkActivityProjectTypeEnumControl.setValue(roadWorkActivity.properties.projectType);

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
                  this.getAllInvolvedOrgs();
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
            ErrorMessageEvaluation._evaluateErrorMessage(roadWorkActivityFeature);
            if (roadWorkActivityFeature.errorMessage.trim().length !== 0) {
              this.snckBar.open(roadWorkActivityFeature.errorMessage, "", {
                duration: 4000
              });
            } else {
              this.snckBar.open("Vorhaben wurde erfolgreich erstellt", "", {
                duration: 4000,
              });
              this.router.navigate(["/activities/" + roadWorkActivityFeature.properties.uuid]);
            }
          }
        },
        error: (error) => {
        }
      });
  }

  update() {
    if (this.roadWorkActivityFeature && this.roadWorkActivityFeature.properties.uuid) {
      this.roadWorkActivityFeature.properties.finishFrom = this.finishFromControl.value;
      this.roadWorkActivityFeature.properties.finishTo = this.finishToControl.value;
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
                        if (roadWorkActivityFeature.properties.costs == 0)
                          roadWorkActivityFeature.properties.costs = undefined;
                        if (roadWorkActivityFeature.properties.investmentNo == 0)
                          roadWorkActivityFeature.properties.investmentNo = undefined;
                        this.roadWorkActivityFeature = roadWorkActivityFeature;
                        this.managementArea = managementAreas[0];
                        this.snckBar.open("Vorhaben ist gespeichert", "", {
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

  onRoadWorkActivityEnumChange() {
    if (this.roadWorkActivityFeature && this.roadWorkActivityFeature.properties.uuid) {
      this.roadWorkActivityFeature.properties.status.code = this.roadWorkActivityStatusEnumControl.value;
      this.roadWorkActivityFeature.properties.projectType = this.roadWorkActivityProjectTypeEnumControl.value;
      this.update();
    }
  }

  registerTrefficManager() {
    if (this.roadWorkActivityFeature && this.roadWorkActivityFeature.properties.uuid) {
      this.roadWorkActivityService.registerTrafficManager(this.roadWorkActivityFeature)
        .subscribe({
          next: (roadWorkActivityFeature) => {
            if (roadWorkActivityFeature) {
              ErrorMessageEvaluation._evaluateErrorMessage(roadWorkActivityFeature);
              if (roadWorkActivityFeature.errorMessage.trim().length !== 0) {
                this.snckBar.open(roadWorkActivityFeature.errorMessage, "", {
                  duration: 4000
                });
              } else {
                this.roadWorkActivityFeature = roadWorkActivityFeature;
                this.snckBar.open("Vorhaben ist gespeichert", "", {
                  duration: 4000,
                });
              }
            }
          },
          error: (error) => {
          }
        });
    }
  }

  checkStatusDisabled(currValue: string, valueToCheck: string): boolean {
    if (currValue === 'review') {
      if (valueToCheck === 'review')
        return true;
      else
        return false;
    } else if (currValue === 'inconsult') {
      if (valueToCheck === 'review')
        return true;
      else if (valueToCheck === 'inconsult')
        return true;
      else
        return false;
    } else if (currValue === 'verified') {
      if (valueToCheck === 'review')
        return true;
      else if (valueToCheck === 'inconsult')
        return true;
      else if (valueToCheck === 'verified')
        return true;
      else
        return false;
    } else if (currValue === 'reporting') {
      if (valueToCheck === 'review')
        return true;
      else if (valueToCheck === 'inconsult')
        return true;
      else if (valueToCheck === 'verified')
        return true;
      else if (valueToCheck === 'reporting')
        return true;
      else
        return false;
    } else if (currValue === 'coordinated' ||
      currValue === 'suspended') {
      if (valueToCheck === 'review')
        return true;
      else if (valueToCheck === 'inconsult')
        return true;
      else if (valueToCheck === 'verified')
        return true;
      else if (valueToCheck === 'reporting')
        return true;
      else if (valueToCheck === 'coordinated')
        return true;
      else
        return false;
    }
    return true;
  }

  getAllInvolvedOrgs() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkNeedService.getRoadWorkNeeds(this.roadWorkActivityFeature.properties.roadWorkNeedsUuids)
        .subscribe({
          next: (roadWorkNeeds) => {
            if (roadWorkNeeds) {
              if (roadWorkNeeds.length > 0 && roadWorkNeeds[0]) {
                ErrorMessageEvaluation._evaluateErrorMessage(roadWorkNeeds[0]);
                if (roadWorkNeeds[0].errorMessage.trim().length !== 0) {
                  this.snckBar.open(roadWorkNeeds[0].errorMessage, "", {
                    duration: 4000
                  });
                } else {
                  for (let roadWorkNeed of roadWorkNeeds) {
                    this.involvedUsers.push(roadWorkNeed.properties.orderer)
                  }
                }
              }
            }
          },
          error: (error) => {
            this.snckBar.open("Organisationen konnten nicht geladen werden", "", {
              duration: 4000,
            });
          }
        });
    }
  }

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
  }

}
