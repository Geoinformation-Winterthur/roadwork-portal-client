/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
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
import { OrganisationService } from 'src/services/organisation.service';
import { AppConfigService } from 'src/services/app-config.service';
import { ConfigurationData } from 'src/model/configuration-data';
import { OrganisationalUnit } from 'src/model/organisational-unit';
import { environment } from 'src/environments/environment';
import { StatusHelper } from 'src/helper/status-helper';
import { EnumType } from 'src/model/enum-type';
import { DocumentService } from 'src/services/document.service';
import { MatDialog } from '@angular/material/dialog';
import { DeleteActivityDialogComponent } from '../delete-activity-dialog/delete-activity-dialog.component';
import { ConsultationInput } from 'src/model/consultation-input';
import { ConsultationService } from 'src/services/consultation.service';

@Component({
  selector: 'app-activity-attributes',
  templateUrl: './activity-attributes.component.html',
  styleUrls: ['./activity-attributes.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ActivityAttributesComponent implements OnInit {

  @ViewChild("edit_activity_map") editActivityMap: any;

  roadWorkActivityFeature?: RoadWorkActivityFeature;
  managementArea?: ManagementArea;

  currentUser: User = new User();
  orderer: User = new User();
  ordererOrgUnitName: string = "";
  areaManagerName: string = "";
  statusCode: string = "";
  priorityCode: string = "";
  involvedUsers: User[] = [];

  availableUsers: User[] = [];
  availableOrganisations: OrganisationalUnit[] = [];
  usersOfChosenOrganisation: User[] = [];

  availableCostTypes: EnumType[] = [];

  userService: UserService;

  projectManagerControl: FormControl = new FormControl();
  costTypesControl: FormControl = new FormControl();
  projectTypeEnumControl: FormControl = new FormControl();
  availableProjectTypes: EnumType[] = [];
  dateSksControl: FormControl = new FormControl();
  dateKapControl: FormControl = new FormControl();
  dateOksControl: FormControl = new FormControl();

  needsOfActivityService: NeedsOfActivityService;
  roadworkNeedsOnMap: RoadWorkNeedFeature[] = [];

  configurationData: ConfigurationData = new ConfigurationData();

  dueDate?: Date;

  showProjectTypeInfo: boolean = false;

  statusHelper: StatusHelper;

  selectedTabIndex = 0;
  selectedSubTabIndex = 0;

  needsDatesDisplayedColumns: string[] = ['name', 'finishEarlyTo', 'finishOptimumTo', 'finishLateTo'];
  needsDocsDisplayedColumns: string[] = ['name', 'documents'];
  chooseInvolvedUserDisplayedColumns: string[] = ['org', 'abbr', 'name', 'choose'];

  assignedRoadWorkNeedsDisplayedColumns: string[] = ["orderer_org", "contact_person", "earliest", "wish", "latest", "time_factor"];

  consultationInputsFromReporting: ConsultationInput[] = [];
  consultationInputsDisplayedColumns: string[] = ["orderer_org", "contact_person", "need", "realisation"];

  private roadWorkActivityService: RoadWorkActivityService;
  private roadWorkNeedService: RoadWorkNeedService;
  private managementAreaService: ManagementAreaService;
  private organisationService: OrganisationService;
  private activatedRoute: ActivatedRoute;
  private router: Router;
  private activatedRouteSubscription: Subscription = new Subscription();
  private documentService: DocumentService;
  private appConfigService: AppConfigService;
  private consultationService: ConsultationService;

  private dialog: MatDialog;
  private snckBar: MatSnackBar;

  constructor(activatedRoute: ActivatedRoute, roadWorkActivityService: RoadWorkActivityService,
    needsOfActivityService: NeedsOfActivityService, managementAreaService: ManagementAreaService,
    roadWorkNeedService: RoadWorkNeedService, userService: UserService,
    organisationService: OrganisationService, appConfigService: AppConfigService,
    consultationService: ConsultationService, router: Router,
    snckBar: MatSnackBar, documentService: DocumentService, dialog: MatDialog) {
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
    this.statusHelper = new StatusHelper();
    this.documentService = documentService;
    this.consultationService = consultationService;
    this.dialog = dialog;
  }

  ngOnInit() {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.availableUsers = users;
      },
      error: (error) => {
      }
    });

    this.userService.getUserFromDB(this.userService.getLocalUser().mailAddress)
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
              this.currentUser = user;
            }
          }
        },
        error: (error) => {
          this.snckBar.open("Beim Laden von Benutzerdaten ist ein Systemfehler aufgetreten. Bitte wenden Sie sich an den Administrator.", "", {
            duration: 4000
          });
        }
      });

    this.appConfigService.getConfigurationData(true)
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

    this.roadWorkActivityService.getProjectTypes().subscribe({
      next: (projectTypes) => {
        this.availableProjectTypes = projectTypes;
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
          this.roadWorkActivityFeature.properties.status = "review";
          this.roadWorkActivityFeature.properties.finishEarlyTo = new Date();
          this.roadWorkActivityFeature.properties.isPrivate = true;
          let plus50Years: Date = new Date();
          plus50Years.setFullYear(plus50Years.getFullYear() + 50);
          this.roadWorkActivityFeature.properties.finishLateTo = plus50Years;
          this.roadWorkActivityFeature.properties.costsType = "municipal";
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

                  this.managementAreaService.getIntersectingManagementArea(roadWorkActivityFeature.geometry)
                    .subscribe({
                      next: (managementArea) => {
                        if (managementArea) {
                          this.managementArea = managementArea;
                          if (this.roadWorkActivityFeature)
                            this.roadWorkActivityFeature.properties.areaManager = managementArea.manager;
                        }
                      },
                      error: (error) => {
                      }
                    });

                  this.projectTypeEnumControl.setValue(roadWorkActivity.properties.projectType);

                  if (this.roadWorkActivityFeature?.properties.roadWorkNeedsUuids.length !== 0) {
                    this.roadWorkNeedService.getRoadWorkNeeds([], undefined, undefined,
                      undefined, undefined, undefined, undefined, undefined, undefined,
                      this.roadWorkActivityFeature?.properties.uuid)
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

                          let assignedRoadWorkNeedsWithDocuments: RoadWorkNeedFeature[] = []
                          for (let assignedRoadWorkNeed of assignedRoadWorkNeeds) {
                            if (assignedRoadWorkNeed.properties.documentAtts &&
                              assignedRoadWorkNeed.properties.documentAtts.length != 0
                            ) {
                              assignedRoadWorkNeedsWithDocuments.push(assignedRoadWorkNeed);
                            }
                          }
                          this.needsOfActivityService.assignedRoadWorkNeedsWithDocuments = assignedRoadWorkNeedsWithDocuments;

                        },
                        error: (error) => {
                        }
                      });
                  }
                  this._updateAllInvolvedUsers();
                  this._updateDueDate();
                }

                this.activatedRoute.queryParams.subscribe(params => {
                  const tabName = params["open_tab"];
                  if (tabName == "bedarfsklaerung") {
                    this.selectedTabIndex = 2;
                    this.selectedSubTabIndex = 1;
                  } else if (tabName == "stellungnahme") {
                    this.selectedTabIndex = 2;
                    this.selectedSubTabIndex = 2;
                  }
                });

                if (this.roadWorkActivityFeature)
                  this.consultationService.getConsultationInputs(this.roadWorkActivityFeature.properties.uuid)
                    .subscribe({
                      next: (consultationInputs) => {
                        let consultationInputsFromReportingTemp: ConsultationInput[] = [];
                        for (let consultationInput of consultationInputs) {
                          if (consultationInput.feedbackPhase === 'reporting') {
                            consultationInputsFromReportingTemp.push(consultationInput);
                          }
                        }
                        this.consultationInputsFromReporting = consultationInputsFromReportingTemp;

                      },
                      error: (error) => {
                      }
                    });

              },
              error: (error) => {
              }
            });

        }

      });

  }

  publish() {
    if (this.roadWorkActivityFeature) {
      if (this.roadWorkActivityFeature.properties.uuid)
        this.update(true);
      else
        this.add(true);
    }
  }

  save() {
    if (this.roadWorkActivityFeature) {
      if (this.roadWorkActivityFeature.properties.uuid)
        this.update();
      else
        this.add();
    }
  }

  add(publish: boolean = false) {
    if (this.roadWorkActivityFeature) {
      if (publish) this.roadWorkActivityFeature.properties.isPrivate = false;
      this.roadWorkActivityService.addRoadworkActivity(this.roadWorkActivityFeature)
        .subscribe({
          next: (roadWorkActivityFeature) => {
            if (this.roadWorkActivityFeature) {
              ErrorMessageEvaluation._evaluateErrorMessage(roadWorkActivityFeature);
              if (roadWorkActivityFeature.errorMessage.trim().length !== 0) {
                if (publish) this.roadWorkActivityFeature.properties.isPrivate = true;
                this.snckBar.open(roadWorkActivityFeature.errorMessage, "", {
                  duration: 4000
                });
              } else {
                let successMassage: string = "Bauvorhaben wurde erfolgreich erstellt";
                if (publish) successMassage += " und publiziert";
                this.snckBar.open(successMassage, "", {
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
            if (this.roadWorkActivityFeature && publish)
              this.roadWorkActivityFeature.properties.isPrivate = true;
          }
        });
    }
  }

  update(publish: boolean = false, newStatus: string = "") {
    if (this.roadWorkActivityFeature && this.roadWorkActivityFeature.properties.uuid) {
      if (publish) this.roadWorkActivityFeature.properties.isPrivate = false;
      let oldStatus = this.roadWorkActivityFeature.properties.status;
      if (newStatus) this.roadWorkActivityFeature.properties.status = newStatus;
      this.managementAreaService.getIntersectingManagementArea(this.roadWorkActivityFeature.geometry)
        .subscribe({
          next: (managementArea) => {
            if (managementArea) {
              this.roadWorkActivityService.updateRoadWorkActivity(this.roadWorkActivityFeature)
                .subscribe({
                  next: (roadWorkActivityFeature) => {
                    if (this.roadWorkActivityFeature) {
                      ErrorMessageEvaluation._evaluateErrorMessage(roadWorkActivityFeature);
                      if (roadWorkActivityFeature.errorMessage.trim().length !== 0) {
                        if (publish) this.roadWorkActivityFeature.properties.isPrivate = true;
                        if (newStatus) this.roadWorkActivityFeature.properties.status = oldStatus;
                        this.snckBar.open(roadWorkActivityFeature.errorMessage, "", {
                          duration: 4000
                        });
                      } else {
                        if (roadWorkActivityFeature.properties.costs == 0)
                          roadWorkActivityFeature.properties.costs = undefined;
                        if (roadWorkActivityFeature.properties.investmentNo == 0)
                          roadWorkActivityFeature.properties.investmentNo = undefined;
                        this.roadWorkActivityFeature = roadWorkActivityFeature;
                        this.managementArea = managementArea;

                        if (roadWorkActivityFeature.properties.status == "coordinated" &&
                          roadWorkActivityFeature.properties.dateSksReal) {
                          this.editActivityMap.setRoadworkActivityFinished();
                        }

                        this._updateDueDate();

                        let successMassage: string = "Bauvorhaben wurde erfolgreich gespeichert";
                        if (publish) successMassage += " und publiziert";
                        this.snckBar.open(successMassage, "", {
                          duration: 4000,
                        });
                      }
                    }
                  },
                  error: (error) => {
                    if (this.roadWorkActivityFeature) {
                      if (publish) this.roadWorkActivityFeature.properties.isPrivate = true;
                      if (newStatus) this.roadWorkActivityFeature.properties.status = oldStatus;
                    }
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

  onRoadWorkActivityEnumChange() {
    if (this.roadWorkActivityFeature && this.roadWorkActivityFeature.properties.uuid) {
      this.roadWorkActivityFeature.properties.projectType = this.projectTypeEnumControl.value;
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
                this.snckBar.open("Bauvorhaben wurde gespeichert", "", {
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

  getColorDueDate(): string {
    if (this.dueDate) {
      const today: Date = new Date();
      const dueDate: Date = new Date(this.dueDate);
      let threeDaysBeforeDue: Date = new Date(dueDate);
      threeDaysBeforeDue.setDate(dueDate.getDate() - 3);
      let oneDayAfterDue = new Date(dueDate);
      oneDayAfterDue.setDate(dueDate.getDate() + 1);
      if (today >= oneDayAfterDue)
        return "background-color: rgb(255, 109, 109);";
      else if (today >= threeDaysBeforeDue)
        return "background-color: rgb(255, 194, 109);";
    }
    return "background-color: rgb(109, 255, 121);";
  }

  changeInvolvedUsers(user: User) {
    if (this.roadWorkActivityFeature) {
      let involvedUsersCopy = this.roadWorkActivityFeature.properties.involvedUsers.map((x) => x);
      let filteredUser: User[] =
          involvedUsersCopy.filter((involvedUser) => involvedUser.uuid == user.uuid);
      if(filteredUser.length == 0)
        involvedUsersCopy.push(user);
      else
        involvedUsersCopy.splice(
          involvedUsersCopy.indexOf(user), 1);

      this.roadWorkActivityFeature.properties.involvedUsers = involvedUsersCopy;

    }
  }

  isInvolvedUser(user: User): boolean {
    if (this.roadWorkActivityFeature) {
      let filteredUser: User[] =
            this.roadWorkActivityFeature.properties.involvedUsers
                  .filter((involvedUser) => involvedUser.uuid == user.uuid);
      return filteredUser.length != 0;
    }
    return false;
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

  switchProjectTypeInfo() {
    this.showProjectTypeInfo = !this.showProjectTypeInfo;
  }

  uploadPdf(event: any) {
    if (this.roadWorkActivityFeature && event && event.target &&
      event.target.files && event.target.files.length > 0) {
      let file: File = event.target.files[0]
      let formData: FormData = new FormData();
      formData.append("pdfFile", file, file.name);
      this.documentService.uploadDocument(this.roadWorkActivityFeature.properties.uuid, formData, "roadworkactivity").subscribe({
        next: (documentAtts) => {
          ErrorMessageEvaluation._evaluateErrorMessage(documentAtts);
          if (documentAtts !== null && documentAtts.errorMessage !== null &&
            documentAtts.errorMessage.trim().length !== 0) {
            this.snckBar.open(documentAtts.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.roadWorkActivityFeature!.properties.documentAtts!.push(documentAtts);
            this.snckBar.open("PDF-Dokument wurde erfolgreich hochgeladen", "", {
              duration: 4000,
            });
          }
        },
        error: (error) => {
          this.snckBar.open("Fehler beim Upload des PDF-Dokuments.", "", {
            duration: 4000
          });
        }
      });
    }
  }

  downloadPdf(documentUuid: string) {
    if (this.roadWorkActivityFeature) {
      this.documentService.getDocument(this.roadWorkActivityFeature.properties.uuid, documentUuid, "roadworkactivity")
        .subscribe({
          next: (documentData) => {
            if (documentData === null || documentData.size === 0) {
              this.snckBar.open("Dieses Bauvorhaben hat kein angehängtes PDF-Dokument.", "", {
                duration: 4000
              });
            } else {
              let objUrl = window.URL.createObjectURL(documentData);
              let newBrowserTab = window.open();
              if (newBrowserTab)
                newBrowserTab.location.href = objUrl;
            }
          },
          error: (error) => {
            this.snckBar.open("Fehler beim Download des PDF-Dokuments.", "", {
              duration: 4000
            });
          }
        });
    }
  }

  deletePdf(documentUuid: string) {
    if (this.roadWorkActivityFeature) {
      this.documentService.deleteDocument(this.roadWorkActivityFeature.properties.uuid, documentUuid, "roadworkactivity")
        .subscribe({
          next: (documentData) => {
            this.roadWorkActivityFeature!.properties.documentAtts =
              this.roadWorkActivityFeature!.properties.documentAtts?.
                filter((docAttr) => docAttr.uuid !== documentUuid);
            this.snckBar.open("Angehängtes PDF-Dokument wurde gelöscht", "", {
              duration: 4000
            });
          },
          error: (error) => {
            this.snckBar.open("Fehler beim Löschen des PDF-Dokuments.", "", {
              duration: 4000
            });
          }
        });
    }
  }

  removeRoadworkActivity() {
    if (this.roadWorkActivityFeature) {
      if (this.roadWorkActivityFeature.properties.isPrivate) {
        this._deleteRoadworkActivity(this.roadWorkActivityFeature.properties.uuid);
      } else {
        this.dialog.open(DeleteActivityDialogComponent,
          { data: { roadWorkActivityUuid: this.roadWorkActivityFeature?.properties.uuid } }
        );
      }
    }
  }

  isFirstDateBefore(firstDate: Date, secondDate: Date): boolean {
    if (firstDate && secondDate) {
      let firstDateObj = new Date(firstDate);
      let secondDateObj = new Date(secondDate);
      return firstDateObj.getTime() < secondDateObj.getTime();
    }
    return false;
  }

  calcTimeFactor(compareNeed: RoadWorkNeedFeature, primaryNeed: RoadWorkNeedFeature): number {
    if (compareNeed && primaryNeed) {
      if (compareNeed.properties.finishEarlyTo)
        compareNeed.properties.finishEarlyTo = new Date(compareNeed.properties.finishEarlyTo);
      if (compareNeed.properties.finishOptimumTo)
        compareNeed.properties.finishOptimumTo = new Date(compareNeed.properties.finishOptimumTo);
      if (compareNeed.properties.finishLateTo)
        compareNeed.properties.finishLateTo = new Date(compareNeed.properties.finishLateTo);

      if (primaryNeed.properties.finishEarlyTo)
        primaryNeed.properties.finishEarlyTo = new Date(primaryNeed.properties.finishEarlyTo);
      if (primaryNeed.properties.finishOptimumTo)
        primaryNeed.properties.finishOptimumTo = new Date(primaryNeed.properties.finishOptimumTo);
      if (primaryNeed.properties.finishLateTo)
        primaryNeed.properties.finishLateTo = new Date(primaryNeed.properties.finishLateTo);

      if (compareNeed.properties.finishEarlyTo.getTime() > primaryNeed.properties.finishLateTo.getTime())
        return 1;
      if (compareNeed.properties.finishEarlyTo.getTime() > primaryNeed.properties.finishOptimumTo.getTime()
        || compareNeed.properties.finishOptimumTo.getTime() > primaryNeed.properties.finishOptimumTo.getTime())
        return 2;
      if (compareNeed.properties.finishOptimumTo.getTime() > primaryNeed.properties.finishEarlyTo.getTime()
        || compareNeed.properties.finishLateTo.getTime() > primaryNeed.properties.finishEarlyTo.getTime())
        return 3;
      else
        return 4;
    }
    return 0;
  }

  getPrimaryNeed(): RoadWorkNeedFeature {
    if (this.needsOfActivityService.assignedRoadWorkNeeds.length > 0) {
      for (let roadWorkNeed of this.needsOfActivityService.assignedRoadWorkNeeds) {
        if (roadWorkNeed.properties.isPrimary)
          return roadWorkNeed;
      }
    }
    return new RoadWorkNeedFeature();
  }

  private _deleteRoadworkActivity(roadWorkActivityUuid: string) {
    this.roadWorkActivityService.deleteRoadWorkActivity(roadWorkActivityUuid).subscribe({
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

  onChangeIsStudy() {
    if (this.roadWorkActivityFeature) {
      if (!this.roadWorkActivityFeature.properties.isStudy) {
        this.roadWorkActivityFeature.properties.dateStudyStart = undefined;
        this.roadWorkActivityFeature.properties.dateStudyEnd = undefined;
      }
    }
  }

  onChangeIsAggloprog() {
    if (this.roadWorkActivityFeature)
      if (this.roadWorkActivityFeature.properties.isAggloprog)
        this.roadWorkActivityFeature.properties.isSksRelevant = true;
  }

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
  }

  getInvolvedOrgsNames(): string[] {
    let result: string[] = [];
    if (this.roadWorkActivityFeature) {
      for (let involvedUser of this.roadWorkActivityFeature.properties.involvedUsers) {
        if(!result.includes(involvedUser.organisationalUnit.abbreviation))
          result.push(involvedUser.organisationalUnit.abbreviation);
      }
    }
    return result;
  }

  private _updateAllInvolvedUsers() {
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

  private _updateDueDate() {
    if (this.roadWorkActivityFeature) {
      if (this.roadWorkActivityFeature.properties.status == "inconsult" ||
        this.roadWorkActivityFeature.properties.status == "verified") {
        if (this.roadWorkActivityFeature.properties.dateConsultEnd)
          this.dueDate = new Date(this.roadWorkActivityFeature.properties.dateConsultEnd);
      } else if (this.roadWorkActivityFeature.properties.status == "reporting") {
        if (this.roadWorkActivityFeature.properties.dateReportEnd)
          this.dueDate = this.roadWorkActivityFeature.properties.dateReportEnd;
      } else if (this.roadWorkActivityFeature.properties.status == "coordinated") {
        if (this.roadWorkActivityFeature.properties.dateInfoEnd)
          this.dueDate = this.roadWorkActivityFeature.properties.dateInfoEnd;
      } else {
        this.dueDate = new Date();
        this.dueDate.setDate(this.dueDate.getDate() + 7);
      }
    }
  }

  public openMail(newStatus: string) {

    let mailText = "mailto:";

    if (this.roadWorkActivityFeature &&
      (newStatus == "inconsult" || newStatus == "reporting")) {

      if (this.involvedUsers.length > 0) {
        mailText += this.involvedUsers[0].mailAddress + ";"
      }

      for (let involvedUser of this.roadWorkActivityFeature?.properties.involvedUsers) {
        mailText += involvedUser.mailAddress + ";";
      }

      let separator = "?";

      let loggedInUser = this.userService.getLocalUser();
      if (loggedInUser && loggedInUser.mailAddress) {
        mailText += separator + "cc=" + loggedInUser.mailAddress;
        separator = "&";
      }

      mailText += separator + "subject=Die";

      if (newStatus == "inconsult")
        mailText += " Bedarfsklärung ";
      else if (newStatus == "reporting")
        mailText += " Stellungnahme ";

      mailText += "zum Bauvorhaben '" +
        this.roadWorkActivityFeature.properties.name +
        "' beginnt. Deine Meinung ist gefragt.&";

      mailText += "body=Liebe Kolleginnen und Kollegen%0A%0A";
      if (newStatus == "inconsult")
        mailText += "Der untenstehende Bedarf wurde bei uns eingegeben und ist aktuell in der Vernehmlassung (elektronische Zirkulation).%0A%0A";
      else if (newStatus == "reporting")
        mailText += "Das nachfolgende Bauvorhaben ist aktuell in der Vernehmlassung (elektronische Zirkulation).%0A%0A";

      mailText += environment.fullAppPath + "activities/" + this.roadWorkActivityFeature.properties.uuid;
      if (newStatus == "inconsult")
        mailText += "?open_tab=bedarfsklaerung";
      else if (newStatus == "reporting")
        mailText += "?open_tab=stellungnahme";

      mailText += "%0A%0A";
      mailText += environment.fullAppPath + "activities/" + this.roadWorkActivityFeature.properties.uuid + "%0A%0A";
      mailText += "Bezeichnung: " + this.roadWorkActivityFeature.properties.name + "%0A%0A";

      if (newStatus == "inconsult") {
        mailText += "Bitte beurteile, ob in deinem Bereich Bedarf zum Mitbauen besteht oder nicht. ";
        mailText += "Mit Klick auf obigen Link gelangst du zum Bauvorhaben.%0A%0A";
        mailText += "Sollte Bedarf vorhanden sein, so bitten wir dich, den Button «Bedarf erfassen» zu benutzen ";
        mailText += "(Hinweis: Perimeter und Zeitbedarf sind als Vorschlag bereits hinterlegt und können individuell angepasst werden). ";
        mailText += "Du hilfst uns durch Erfassen eines neuen Bedarfs, dein Anliegen besser zu verstehen. ";
        mailText += "Sollte kein Interesse bestehen, dann wähle bitte «Kein Bedarf».%0A%0A";
      }
      else if (newStatus == "reporting")
        mailText += "Mit Klick auf obigen Link kannst du das Bauvorhaben beurteilen und bei Bedarf eine Rückmeldung geben.%0A%0A";

      if (newStatus == "inconsult" && this.roadWorkActivityFeature.properties.dateConsultEnd)
        mailText += "Die Bedarfsklärung läuft bis zum " +
          new Date(this.roadWorkActivityFeature.properties.dateConsultEnd).toLocaleDateString("de-CH") + "%0A%0A";
      else if (newStatus == "reporting" && this.roadWorkActivityFeature.properties.dateReportEnd)
        mailText += "Die Stellungnahme läuft bis zum " +
          new Date(this.roadWorkActivityFeature.properties.dateReportEnd).toLocaleDateString("de-CH") + "%0A%0A";
      if (newStatus == "reporting")
        mailText += "Mit «Senden» übermittelst du uns deine Rückmeldung.%0A%0A";
      mailText += "Vielen Dank für deine Teilnahme.%0A%0A";
      mailText += "Freundliche Grüsse.%0A%0A";
      mailText += this.roadWorkActivityFeature.properties.areaManager.firstName + " "
        + this.roadWorkActivityFeature.properties.areaManager.lastName + "%0A%0A";
      mailText += "Tiefbauamt, Abteilung Planung %26 Koordination%0A%0A";

      window.open(mailText, "_blank", "noreferrer");

    }

  }

}
