/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
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
  styleUrls: ['./activity-attributes.component.css'],
  encapsulation: ViewEncapsulation.None
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
  involvedOrgs: OrganisationalUnit[] = [];

  availableUsers: User[] = [];
  availableOrganisations: OrganisationalUnit[] = [];
  chosenOrganisationUuid: string = "";
  usersOfChosenOrganisation: User[] = [];
  selectedUsersOfChosenOrganisation: User[] = [];

  availableCostTypes: CostType[] = [];

  userService: UserService;

  projectManagerControl: FormControl = new FormControl();
  costTypesControl: FormControl = new FormControl();
  roadWorkActivityStatusEnumControl: FormControl = new FormControl();
  roadWorkActivityProjectTypeEnumControl: FormControl = new FormControl();
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

    this.organisationService.getAllOrgTypes()
      .subscribe({
        next: (orgs) => {
          if (orgs && orgs[0]) {
            ErrorMessageEvaluation._evaluateErrorMessage(orgs[0]);
            if (orgs[0].errorMessage !== "") {
              this.snckBar.open(orgs[0].errorMessage, "", {
                duration: 4000
              });
            } else {
              this.availableOrganisations = orgs;
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
          this.roadWorkActivityFeature.properties.isPrivate = true;
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

  publish() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.isPrivate = false;
      if (this.roadWorkActivityFeature.properties.uuid)
        this.update();
      else
        this.add();
    }
  }

  savePrivate() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.isPrivate = true;
      if (this.roadWorkActivityFeature.properties.uuid)
        this.update();
      else
        this.add();
    }
  }

  add() {
    this.roadWorkActivityService.addRoadworkActivity(this.roadWorkActivityFeature)
      .subscribe({
        next: (roadWorkActivityFeature) => {
          if (this.roadWorkActivityFeature) {
            ErrorMessageEvaluation._evaluateErrorMessage(roadWorkActivityFeature);
            if (roadWorkActivityFeature.errorMessage.trim().length !== 0) {
              this.roadWorkActivityFeature.properties.isPrivate = true;
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
          this.snckBar.open("Unbekannter Fehler beim Senden des Bauvorhabens", "", {
            duration: 4000,
          });
          if (this.roadWorkActivityFeature)
            this.roadWorkActivityFeature.properties.isPrivate = true;
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
                    this.snckBar.open("Unbekannter Fehler beim Senden des Bauvorhabens", "", {
                      duration: 4000
                    });
                  }
                });
            }
          },
          error: (error) => {
          }
        });
    }
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
          this.router.navigate(["/activities/"]);
          this.snckBar.open("Bauvorhaben wurde gelöscht", "", {
            duration: 4000,
          });
        }
      },
      error: (error) => {
      }
    });
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

  selectUsersOfOrganisation() {
    let usersOfChosenOrganisationTemp = [];
    for (let availableUser of this.availableUsers) {
      if (availableUser.organisationalUnit.uuid == this.chosenOrganisationUuid)
        usersOfChosenOrganisationTemp.push(availableUser);
    }
    this.usersOfChosenOrganisation = usersOfChosenOrganisationTemp;
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

  getColorDueDate() : string {
    if(this.roadWorkActivityFeature){
      const today: Date = new Date();
      const consultDue: Date = new Date(this.roadWorkActivityFeature.properties.consultDue);
      let threeDaysBeforeDue: Date = new Date(consultDue);
      threeDaysBeforeDue.setDate(consultDue.getDate() - 3);
      let oneDayAfterDue = new Date(consultDue);
      oneDayAfterDue.setDate(consultDue.getDate() + 1);
      if(today >= threeDaysBeforeDue)
        return "background-color: rgb(255, 109, 109);";
      else if(today >= oneDayAfterDue)
        return "background-color: rgb(255, 194, 109);";
    }
    return "background-color: rgb(109, 255, 121);";
  }

  changeStatus(newStatus: string) {

    if (this.roadWorkActivityFeature && this.roadWorkActivityFeature.properties.uuid) {
      this.roadWorkActivityFeature.properties.status.code = newStatus;
      this.roadWorkActivityStatusEnumControl.setValue(newStatus);
      this.update();
    }

    let mailText = "mailto:";

    if (this.roadWorkActivityFeature &&
      (newStatus == "inconsult" || newStatus == "reporting")) {
      for (let involvedUser of this.roadWorkActivityFeature?.properties.involvedUsers) {
        mailText += involvedUser.mailAddress + ";";
      }

      mailText += "?subject=Ihre Meinung ist gefragt.&";
      mailText += "body=Sehr geehrte Damen und Herren%0A%0A";
      mailText += "Der untenstehende Bedarf wurde bei uns eingegeben und ist aktuell in der Vernehmlassung (elektronische Zirkulation).%0A%0A";
      mailText += "Bitte beurteilen Sie, ob in Ihrem Bereich Bedarf zum Mitbauen besteht oder nicht.%0A%0A";
      mailText += "Sollte Bedarf vorhanden sein, so bitten wir Sie, den Bedarf genauer zu erläutern und eine Beurteilung aus Ihrer Sicht abzugeben. Sie können auch einen neuen Bedarf via Button erfassen (Hinweis: mit Wählen des Button öffnet sich die Eingabemaske und Sie können einen neuen Bedarf inkl. Perimeter eingeben).%0A%0A";
      mailText += "Die Bedarfsklärung läuft bis XXX.%0A%0A";
      mailText += "Mit «Speichern» übermitteln Sie uns Ihre Rückmeldung.%0A%0A";
      mailText += "Vielen Dank für Ihre Teilnahme.%0A%0A";
      mailText += "Freundliche Grüsse.%0A%0A";
      mailText += "Tiefbauamt, Abteilung Planung & Koordination%0A%0A";
      window.open(mailText, "_blank", "noreferrer");

    }

  }

  getAllInvolvedOrgs() {
    if (this.roadWorkActivityFeature) {
      let involvedOrgs: Map<string, OrganisationalUnit> = new Map();
      for (let involvedUser of this.roadWorkActivityFeature.properties.involvedUsers) {
        involvedOrgs.set(involvedUser.organisationalUnit.uuid, involvedUser.organisationalUnit);
      }
      this.involvedOrgs = Array.from(involvedOrgs.values());
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

  changeInvolvedUsers() {
    if (this.roadWorkActivityFeature) {
      if (!this.roadWorkActivityFeature.properties.involvedUsers) {
        this.roadWorkActivityFeature.properties.involvedUsers = [];
      }
      if (this.chosenOrganisationUuid) {
        this.roadWorkActivityFeature.properties.involvedUsers =
          this.roadWorkActivityFeature.properties.involvedUsers.filter((user) => user.organisationalUnit.uuid != this.chosenOrganisationUuid);
      }
      for (let selectedUserOfChosenOrganisation of this.selectedUsersOfChosenOrganisation) {
        this.roadWorkActivityFeature.properties.involvedUsers.push(selectedUserOfChosenOrganisation);
      }
      this.update();
      this.getAllInvolvedOrgs();
    }
  }

  isInvolvedUserSelected(userUuid: string): boolean {
    if (this.roadWorkActivityFeature) {
      for (let involvedUser of this.roadWorkActivityFeature.properties.involvedUsers) {
        if (involvedUser.uuid == userUuid)
          return true;
      }
    }
    return false;
  }

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
  }

}
