/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
import { User } from 'src/model/user';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { ManagementArea } from 'src/model/management-area';
import { ManagementAreaService } from 'src/services/management-area.service';
import { DateHelper } from 'src/helper/date-helper';
import { DocumentService } from 'src/services/document.service';
import { environment } from 'src/environments/environment';
import { DeleteNeedDialogComponent } from '../delete-need-dialog/delete-need-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSliderChange } from '@angular/material/slider';
import { Costs } from 'src/model/costs';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-need-attributes',
  templateUrl: './need-attributes.component.html',
  styleUrls: ['./need-attributes.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class NeedAttributesComponent implements OnInit {

  roadWorkNeedFeature?: RoadWorkNeedFeature;
  orderer: User = new User();
  ordererOrgUnitName: string = "";
  areaManagerName: string = "";
  statusCode: string = "";
  priorityCode: string = "";

  finishEarlyFormControl: FormControl = new FormControl();
  finishOptimumFormControl: FormControl = new FormControl();
  finishLateFormControl: FormControl = new FormControl();

  showRelevanceInfo: boolean = false;

  userService: UserService;

  environment = environment;

  overarchingMeasureControl: FormControl = new FormControl();

  private dateSlidersDirty: boolean = false;
  private roadWorkNeedService: RoadWorkNeedService;
  private managementAreaService: ManagementAreaService;
  private documentService: DocumentService;
  private activatedRoute: ActivatedRoute;
  private router: Router;
  private activatedRouteSubscription: Subscription = new Subscription();

  private dialog: MatDialog;
  private snckBar: MatSnackBar;

  constructor(activatedRoute: ActivatedRoute,
    roadWorkNeedService: RoadWorkNeedService,
    documentService: DocumentService,
    userService: UserService, snckBar: MatSnackBar,
    managementAreaService: ManagementAreaService,
    router: Router, dialog: MatDialog) {
    this.activatedRoute = activatedRoute;
    this.roadWorkNeedService = roadWorkNeedService;
    this.documentService = documentService;
    this.managementAreaService = managementAreaService;
    this.userService = userService;
    this.router = router;
    this.snckBar = snckBar;
    this.dialog = dialog;
  }

  ngOnInit() {
    this.activatedRouteSubscription = this.activatedRoute.params
      .subscribe(params => {
        let idParamString: string = params['id'];

        if (idParamString == "new") {
          this.activatedRoute.queryParams.subscribe(queryParams => {
            this.roadWorkNeedFeature = NeedAttributesComponent.
              _createNewRoadWorkNeedFeature();

            let finishEarlyToParamString: string = queryParams['finishEarlyTo'];
            let finishOptimumToParamString: string = queryParams['finishOptimumTo'];
            let finishLateToParamString: string = queryParams['finishLateTo'];
            let coordinatesParamString: string = queryParams['coordinates'];

            if (finishEarlyToParamString) {
              this.roadWorkNeedFeature.properties.finishEarlyTo =
                new Date(finishEarlyToParamString);
              this.finishEarlyFormControl.setValue(this._convertDateToQuartal(this.roadWorkNeedFeature.properties.finishEarlyTo));
            }
            if (finishOptimumToParamString) {
              this.roadWorkNeedFeature.properties.finishOptimumTo
                = new Date(finishOptimumToParamString);
              this.finishOptimumFormControl.setValue(this._convertDateToQuartal(this.roadWorkNeedFeature.properties.finishOptimumTo));
            }
            if (finishLateToParamString) {
              this.roadWorkNeedFeature.properties.finishLateTo =
                new Date(finishLateToParamString);
              this.finishLateFormControl.setValue(this._convertDateToQuartal(this.roadWorkNeedFeature.properties.finishLateTo));
            }

            if (coordinatesParamString)
              this.roadWorkNeedFeature.geometry =
                new RoadworkPolygon(coordinatesParamString);

            this._setUserOnRoadworkNeed();
            this.roadWorkNeedFeature.properties.managementArea = NeedAttributesComponent.
              _createNewManagementArea();
          });
        } else {

          let constProjId: string = params['id'];

          this.roadWorkNeedService.getRoadWorkNeeds([constProjId])
            .subscribe({
              next: (roadWorkNeeds) => {
                if (roadWorkNeeds.length === 1) {
                  let roadWorkNeed: any = roadWorkNeeds[0];
                  let rwPoly: RoadworkPolygon = new RoadworkPolygon();
                  rwPoly.coordinates = roadWorkNeed.geometry.coordinates
                  roadWorkNeed.geometry = rwPoly;
                  this.roadWorkNeedFeature = roadWorkNeed;
                  let roadWorkNeedFeature: RoadWorkNeedFeature = this.roadWorkNeedFeature as RoadWorkNeedFeature;

                  if (this.roadWorkNeedFeature) {
                    if (!roadWorkNeedFeature.properties.spongeCityMeasures)
                      roadWorkNeedFeature.properties.spongeCityMeasures = [];

                    this.finishOptimumFormControl.setValue(this._convertDateToQuartal(this.roadWorkNeedFeature.properties.finishOptimumTo));
                    this.finishEarlyFormControl.setValue(this._convertDateToQuartal(this.roadWorkNeedFeature.properties.finishEarlyTo));
                    this.finishLateFormControl.setValue(this._convertDateToQuartal(this.roadWorkNeedFeature.properties.finishLateTo));
                  }

                  this.managementAreaService.getIntersectingManagementArea(roadWorkNeedFeature.geometry)
                    .subscribe({
                      next: (managementArea) => {
                        if (this.roadWorkNeedFeature && managementArea) {
                          this.roadWorkNeedFeature.properties.managementArea = managementArea;
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

      });

  }

  publish() {
    if (this.roadWorkNeedFeature) {
      if (!this.roadWorkNeedFeature.properties.uuid && !this.dateSlidersDirty) {
        this.snckBar.open("Bedarf nicht gespeichert. Bitte setzen Sie zuerst die Wunschtermine.", "", {
          duration: 4000
        });
      } else {
        this.roadWorkNeedFeature.properties.isPrivate = false;
        if (this.roadWorkNeedFeature.properties.uuid)
          this.save();
        else
          this.add();
      }
    } else {
      this.snckBar.open("Bedarf konnte nicht gespeichert werden, da kein Bedarfsobjekt vorliegt.", "", {
        duration: 4000
      });
    }
  }

  store() {
    if (this.roadWorkNeedFeature) {
      if (!this.roadWorkNeedFeature.properties.uuid && !this.dateSlidersDirty) {
        this.snckBar.open("Bedarf nicht gespeichert. Bitte setzen Sie zuerst die Wunschtermine.", "", {
          duration: 4000
        });
      } else {
        if (this.roadWorkNeedFeature.properties.uuid)
          this.save();
        else
          this.add();
      }
    } else {
      this.snckBar.open("Bedarf konnte nicht gespeichert werden, da kein Bedarfsobjekt vorliegt.", "", {
        duration: 4000
      });
    }
  }

  add() {
    if (this.roadWorkNeedFeature) {
      this.roadWorkNeedService.addRoadworkNeed(this.roadWorkNeedFeature)
        .subscribe({
          next: (roadWorkNeedFeature) => {
            if (this.roadWorkNeedFeature && roadWorkNeedFeature) {
              ErrorMessageEvaluation._evaluateErrorMessage(roadWorkNeedFeature);
              if (roadWorkNeedFeature.errorMessage.trim().length !== 0) {
                this.roadWorkNeedFeature.properties.isPrivate = true;
                this.snckBar.open(roadWorkNeedFeature.errorMessage, "", {
                  duration: 4000
                });
              } else {
                this.roadWorkNeedFeature = roadWorkNeedFeature;
                              

                // editing is not allowed anymore when the need got assigned to roadwork activity
                if (this.roadWorkNeedFeature?.properties.activityRelationType === "assignedneed"
                      && this.userService.getLocalUser().chosenRole != 'administrator') {
                      this.roadWorkNeedFeature!.properties.isEditingAllowed = false;
                }

                this.snckBar.open("Bedarf wurde erfolgreich erstellt", "", {
                  duration: 4000,
                });
                this.router.navigate(["/needs/" + roadWorkNeedFeature.properties.uuid]);
              }
            }
          },
          error: (error) => {
            this.snckBar.open("Unbekannter Fehler beim Senden des Bedarfs", "", {
              duration: 4000,
            });
            if (this.roadWorkNeedFeature)
              this.roadWorkNeedFeature.properties.isPrivate = true;
          }
        });

    }
  }

  updateQuartal(sliderChange: MatSliderChange, quartalType: string) {
    this.dateSlidersDirty = true;

    let newQuartal: number = sliderChange.value as number;

    if (quartalType === "finishEarlyQuartal") {
      this.roadWorkNeedFeature!.properties.finishEarlyTo =
        this._convertQuartalToDate(newQuartal);
      if (newQuartal > this.finishOptimumFormControl.value)
        this._setQuartalValue(newQuartal, "finishOptimumQuartal");
      if (newQuartal > this.finishLateFormControl.value)
        this._setQuartalValue(newQuartal, "finishLateQuartal");
    } else if (quartalType === "finishOptimumQuartal") {
      this.roadWorkNeedFeature!.properties.finishOptimumTo =
        this._convertQuartalToDate(newQuartal);
      if (newQuartal < this.finishEarlyFormControl.value)
        this._setQuartalValue(newQuartal, "finishEarlyQuartal");
      if (newQuartal > this.finishLateFormControl.value)
        this._setQuartalValue(newQuartal, "finishLateQuartal");
    } else if (quartalType === "finishLateQuartal") {
      this.roadWorkNeedFeature!.properties.finishLateTo =
        this._convertQuartalToDate(newQuartal);
      if (newQuartal < this.finishOptimumFormControl.value)
        this._setQuartalValue(newQuartal, "finishOptimumQuartal");
      if (newQuartal < this.finishEarlyFormControl.value)
        this._setQuartalValue(newQuartal, "finishEarlyQuartal");
    }

  }

  save() {

    if (this.roadWorkNeedFeature && this.roadWorkNeedFeature.properties.uuid) {
      this.managementAreaService.getIntersectingManagementArea(this.roadWorkNeedFeature.geometry)
        .subscribe({
          next: (managementArea) => {
            if (managementArea) {

              this.roadWorkNeedService.updateRoadWorkNeed(this.roadWorkNeedFeature)
                .subscribe({
                  next: (roadWorkNeedFeature) => {
                    if (this.roadWorkNeedFeature && roadWorkNeedFeature) {
                      ErrorMessageEvaluation._evaluateErrorMessage(roadWorkNeedFeature);
                      if (roadWorkNeedFeature.errorMessage.trim().length !== 0) {
                        this.snckBar.open(roadWorkNeedFeature.errorMessage, "", {
                          duration: 4000
                        });
                      } else {
                        if (roadWorkNeedFeature.properties.costs == 0) {
                          roadWorkNeedFeature.properties.costs = null;
                        }
                        this.roadWorkNeedFeature = roadWorkNeedFeature;

                        // editing is not allowed anymore when the need got assigned to roadwork activity
                        if (this.roadWorkNeedFeature?.properties.activityRelationType === "assignedneed"
                            && this.userService.getLocalUser().chosenRole != 'administrator') {
                          this.roadWorkNeedFeature!.properties.isEditingAllowed = false;
                        }

                        if (this.roadWorkNeedFeature)
                          this.roadWorkNeedFeature.properties.managementArea = managementArea;
                        this.snckBar.open("Bedarf ist gespeichert", "", {
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

  writeOutQuartal(finishDateType: string): string {
    let result: string = "";

    if (this.roadWorkNeedFeature) {
      let finishDate: Date | undefined;
      if (finishDateType == "finishEarlyTo") {
        finishDate = new Date(this.roadWorkNeedFeature.properties.finishEarlyTo);
      } else if (finishDateType == "finishOptimumTo") {
        finishDate = new Date(this.roadWorkNeedFeature.properties.finishOptimumTo);
      } else if (finishDateType == "finishLateTo") {
        finishDate = new Date(this.roadWorkNeedFeature.properties.finishLateTo);
      }
      if (finishDate) {
        let finishMonth: number = finishDate.getMonth() + 1;
        let finishQuartal: number = Math.ceil(finishMonth / 3);
        if (finishQuartal === 1) {
          result += "1. Quartal ";
        } else if (finishQuartal === 2) {
          result += "2. Quartal ";
        } else if (finishQuartal === 3) {
          result += "3. Quartal ";
        } else {
          result += "4. Quartal ";
        }
        result += finishDate.getFullYear();
      }
    }

    return result;
  }

  uploadPdf(event: any) {
    if (this.roadWorkNeedFeature && event && event.target &&
      event.target.files && event.target.files.length > 0) {
      let file: File = event.target.files[0]
      let formData: FormData = new FormData();
      formData.append("pdfFile", file, file.name);
      this.documentService.uploadDocument(this.roadWorkNeedFeature.properties.uuid, formData, "roadworkneed").subscribe({
        next: (documentAtts) => {
          ErrorMessageEvaluation._evaluateErrorMessage(documentAtts);
          if (documentAtts !== null && documentAtts.errorMessage !== null &&
            documentAtts.errorMessage.trim().length !== 0) {
            this.snckBar.open(documentAtts.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.roadWorkNeedFeature!.properties.documentAtts!.push(documentAtts);
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
    if (this.roadWorkNeedFeature) {
      this.documentService.getDocument(this.roadWorkNeedFeature.properties.uuid, documentUuid, "roadworkneed")
        .subscribe({
          next: (documentData) => {
            if (documentData === null || documentData.size === 0) {
              this.snckBar.open("Dieser Bedarf hat kein angehängtes PDF-Dokument.", "", {
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
    if (this.roadWorkNeedFeature) {
      this.documentService.deleteDocument(this.roadWorkNeedFeature.properties.uuid, documentUuid, "roadworkneed")
        .subscribe({
          next: (documentData) => {
            this.roadWorkNeedFeature!.properties.documentAtts =
              this.roadWorkNeedFeature!.properties.documentAtts?.
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

  addCostsEstimation() {
    if (this.roadWorkNeedFeature) {
      let costs: Costs = new Costs();
      costs.uuid = uuidv4();
      if (!this.roadWorkNeedFeature.properties.costs)
        this.roadWorkNeedFeature.properties.costs = [];
      this.roadWorkNeedFeature.properties.costs?.push(costs);
    }
  }

  deleteCostsEstimation(costsUuid: string | undefined) {
    if (costsUuid &&
      this.roadWorkNeedFeature && this.roadWorkNeedFeature.properties.costs) {
      this.roadWorkNeedFeature.properties.costs =
        this.roadWorkNeedFeature.properties.costs.filter((costs) => costs.uuid != costsUuid);
    }
  }

  openDeleteDialog(uuid: string) {
    const deleteDialog = this.dialog.open(DeleteNeedDialogComponent);
    deleteDialog.afterClosed().subscribe(isDeleteYes => {
      if (isDeleteYes) {
        this.deleteNeed(uuid);
      }
    });
  }

  deleteNeed(uuid: string) {
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
            this.router.navigate(["/needs/"]);
            this.snckBar.open("Bedarf wurde gelöscht", "", {
              duration: 4000,
            });
          }
        },
        error: (error) => {
          this.snckBar.open("Ein Systemfehler ist aufgetreten. Bitte wenden Sie sich an den Administrator.", "", {
            duration: 4000
          });
        }
      });
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
  }

  private _setUserOnRoadworkNeed() {
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
              if (this.roadWorkNeedFeature) {
                this.roadWorkNeedFeature.properties.orderer = user;
              }
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

  private _setQuartalValue(newQuartal: number, quartalType: string) {
    if (quartalType === "finishEarlyQuartal") {
      this.finishEarlyFormControl.setValue(newQuartal);
      this.roadWorkNeedFeature!.properties.finishEarlyTo =
        this._convertQuartalToDate(newQuartal);
    } else if (quartalType === "finishOptimumQuartal") {
      this.finishOptimumFormControl.setValue(newQuartal);
      this.roadWorkNeedFeature!.properties.finishOptimumTo =
        this._convertQuartalToDate(newQuartal);
    } else if (quartalType === "finishLateQuartal") {
      this.finishLateFormControl.setValue(newQuartal);
      this.roadWorkNeedFeature!.properties.finishLateTo =
        this._convertQuartalToDate(newQuartal);
    }
  }

  private _convertQuartalToDate(quartalCount: number): Date {
    let result: Date = new Date();
    let currentDate: Date = new Date();

    let currentMonth: number = currentDate.getMonth() + 1;
    let currentQuartal: number = Math.ceil(currentMonth / 3);
    let quartalModulo: number = (currentQuartal + quartalCount) % 4;

    if (quartalModulo === 1) {
      result.setMonth(1);
    } else if (quartalModulo === 2) {
      result.setMonth(3);
    } else if (quartalModulo === 3) {
      result.setMonth(6);
    } else {
      result.setMonth(9);
    }

    let currentYear: number = currentDate.getFullYear();

    let addYears = 0;
    let averallQuartal = (currentQuartal + quartalCount - 1) / 4;
    addYears = Math.floor(averallQuartal);

    result.setFullYear(currentYear + addYears);

    result.setDate(1);

    return result;
  }

  private _convertDateToQuartal(realizationDate: Date): number {
    let currentDate: Date = new Date();
    realizationDate = new Date(realizationDate);
    let monthDiff = DateHelper.calcMonthDiff(currentDate, realizationDate);
    return Math.ceil(monthDiff / 3);
  }

  private static _createNewRoadWorkNeedFeature(): RoadWorkNeedFeature {

    let roadWorkNeedFeature: RoadWorkNeedFeature = new RoadWorkNeedFeature();
    roadWorkNeedFeature.properties.status = "requirement";
    roadWorkNeedFeature.properties.priority.code = "middle";
    roadWorkNeedFeature.properties.isEditingAllowed = true;
    roadWorkNeedFeature.properties.isPrivate = true;
    roadWorkNeedFeature.properties.created = new Date();
    roadWorkNeedFeature.properties.lastModified = new Date();
    roadWorkNeedFeature.properties.spongeCityMeasures = [];

    let today: Date = new Date();

    roadWorkNeedFeature.properties.finishEarlyTo = today;
    roadWorkNeedFeature.properties.finishOptimumTo = today;
    roadWorkNeedFeature.properties.finishLateTo = today;

    return roadWorkNeedFeature;
  }

  private static _createNewManagementArea(): ManagementArea {
    let managementarea: ManagementArea = new ManagementArea();
    let managerForRoadWorkNeed: User = new User();
    managerForRoadWorkNeed.lastName = "Noch nicht ermittelt";
    managementarea.manager = managerForRoadWorkNeed;
    return managementarea;
  }

}
