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
import { AbstractControl, FormControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { ManagementArea } from 'src/model/management-area';
import { ManagementAreaService } from 'src/services/management-area.service';
import { DateHelper } from 'src/helper/date-helper';
import { DocumentService } from 'src/services/document.service';
import { environment } from 'src/environments/environment';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { DeleteNeedDialogComponent } from '../delete-need-dialog/delete-need-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-need-attributes',
  templateUrl: './need-attributes.component.html',
  styleUrls: ['./need-attributes.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class NeedAttributesComponent implements OnInit {

  finishOptimumQuartal: number = 0;
  finishEarlyQuartal: number = 0;
  finishLateQuartal: number = 0;

  roadWorkNeedFeature?: RoadWorkNeedFeature;
  orderer: User = new User();
  ordererOrgUnitName: string = "";
  areaManagerName: string = "";
  statusCode: string = "";
  priorityCode: string = "";

  showRelevanceInfo: boolean = false;

  user: User = new User();

  environment = environment;

  overarchingMeasureControl: FormControl = new FormControl();
  urlControl: FormControl = new FormControl('',
    [
      this._isUrlValidator()
    ]);

  private _isUrlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      let urlToCheck = control.value;
      if (!urlToCheck)
        return null;
      try {
        let urlObj = new URL(urlToCheck);
        return null;
      } catch (_) {
        return { noUrl: true };
      }
    }
  }


  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;
  private managementAreaService: ManagementAreaService;
  private userService: UserService;
  private documentService: DocumentService;
  private activatedRoute: ActivatedRoute;
  private router: Router;
  private activatedRouteSubscription: Subscription = new Subscription();

  private dialog: MatDialog;
  private snckBar: MatSnackBar;

  constructor(activatedRoute: ActivatedRoute,
    roadWorkNeedService: RoadWorkNeedService,
    roadWorkActivityService: RoadWorkActivityService,
    documentService: DocumentService,
    userService: UserService, snckBar: MatSnackBar,
    managementAreaService: ManagementAreaService,
    router: Router, dialog: MatDialog) {
    this.activatedRoute = activatedRoute;
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
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
          this.roadWorkNeedFeature = NeedAttributesComponent.
            _createNewRoadWorkNeedFeature(this.userService.getLocalUser());
          this.roadWorkNeedFeature.properties.managementArea = NeedAttributesComponent.
            _createNewManagementArea();
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
                    this.urlControl.setValue(this.roadWorkNeedFeature.properties.url);

                    this.finishOptimumQuartal = this._convertDateToQuartal(this.roadWorkNeedFeature.properties.finishOptimumTo);
                    this.finishEarlyQuartal = this._convertDateToQuartal(this.roadWorkNeedFeature.properties.finishEarlyTo);
                    this.finishLateQuartal = this._convertDateToQuartal(this.roadWorkNeedFeature.properties.finishLateTo);
                  }

                  this.managementAreaService.getIntersectingManagementAreas(roadWorkNeedFeature.geometry)
                    .subscribe({
                      next: (managementAreas) => {
                        if (this.roadWorkNeedFeature && managementAreas && managementAreas.length !== 0) {
                          this.roadWorkNeedFeature.properties.managementArea = managementAreas[0];
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
              if (this.roadWorkNeedFeature) {
                this.roadWorkNeedFeature.properties.orderer.organisationalUnit =
                  user.organisationalUnit;
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

  publish() {
    if (this.roadWorkNeedFeature) {
      this.roadWorkNeedFeature.properties.isPrivate = false;
      if (this.roadWorkNeedFeature.properties.uuid)
        this.update();
      else
        this.add();
    }
  }

  savePrivate() {
    if (this.roadWorkNeedFeature) {
      this.roadWorkNeedFeature.properties.isPrivate = true;
      if (this.roadWorkNeedFeature.properties.uuid)
        this.update();
      else
        this.add();
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

                // editing is not allowed anymore when the need goes public (is not private):
                if (!this.roadWorkNeedFeature?.properties.isPrivate
                  && !(this.userService.getLocalUser().role.code === 'administrator')) {
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

  update() {
    if (this.finishEarlyQuartal > this.finishOptimumQuartal)
      this.finishOptimumQuartal = this.finishEarlyQuartal;
    if (this.finishOptimumQuartal > this.finishLateQuartal)
      this.finishLateQuartal = this.finishOptimumQuartal;

    this.roadWorkNeedFeature!.properties.finishOptimumTo =
      this._convertQuartalToDate(this.finishOptimumQuartal);
    this.roadWorkNeedFeature!.properties.finishEarlyTo =
      this._convertQuartalToDate(this.finishEarlyQuartal);
    this.roadWorkNeedFeature!.properties.finishLateTo =
      this._convertQuartalToDate(this.finishLateQuartal);

    this.roadWorkNeedFeature!.properties.url = this.urlControl.value;
    
    if (this.roadWorkNeedFeature && this.roadWorkNeedFeature.properties.uuid) {
      this.managementAreaService.getIntersectingManagementAreas(this.roadWorkNeedFeature.geometry)
        .subscribe({
          next: (managementAreas) => {
            if (managementAreas && managementAreas.length !== 0) {

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

                        // editing is not allowed anymore when the need goes public (is not private):
                        if (!this.roadWorkNeedFeature?.properties.isPrivate
                          && !(this.userService.getLocalUser().role.code === 'administrator')) {
                          this.roadWorkNeedFeature!.properties.isEditingAllowed = false;
                        }

                        if(this.roadWorkNeedFeature)
                          this.roadWorkNeedFeature.properties.managementArea = managementAreas[0];
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

  createNewActivityFromNeed() {
    if (this.roadWorkNeedFeature) {
      let roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();
      roadWorkActivity.geometry = this.roadWorkNeedFeature.geometry;
      roadWorkActivity.properties.name = this.roadWorkNeedFeature.properties.name;
      roadWorkActivity.properties.description = this.roadWorkNeedFeature.properties.description;
      roadWorkActivity.properties.comment = this.roadWorkNeedFeature.properties.comment;
      roadWorkActivity.properties.costsType.code = "valuation";
      if(this.roadWorkNeedFeature.properties.costs)
        roadWorkActivity.properties.costs = this.roadWorkNeedFeature.properties.costs;
      else
        roadWorkActivity.properties.costs = -1;
      if(this.roadWorkNeedFeature.properties.desiredYearFrom)
        roadWorkActivity.properties.desiredYearFrom = this.roadWorkNeedFeature.properties.desiredYearFrom;
      if(this.roadWorkNeedFeature.properties.desiredYearTo)
        roadWorkActivity.properties.desiredYearTo = this.roadWorkNeedFeature.properties.desiredYearTo;
      roadWorkActivity.properties.finishEarlyTo = this.roadWorkNeedFeature.properties.finishEarlyTo;
      roadWorkActivity.properties.finishOptimumTo = this.roadWorkNeedFeature.properties.finishOptimumTo;
      roadWorkActivity.properties.finishLateTo = this.roadWorkNeedFeature.properties.finishLateTo;
      roadWorkActivity.properties.isPrivate = true;
      roadWorkActivity.properties.overarchingMeasure = this.roadWorkNeedFeature.properties.overarchingMeasure;
      roadWorkActivity.properties.section = this.roadWorkNeedFeature.properties.section;

      roadWorkActivity.properties.roadWorkNeedsUuids.push(this.roadWorkNeedFeature.properties.uuid);

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

  writeOutQuartal(finishDateType: string): string {
    let result: string = "";

    if(this.roadWorkNeedFeature){
      let finishDate: Date | undefined;
      if(finishDateType == "finishEarlyTo"){
        finishDate = new Date(this.roadWorkNeedFeature.properties.finishEarlyTo);
      } else if(finishDateType == "finishOptimumTo"){
        finishDate = new Date(this.roadWorkNeedFeature.properties.finishOptimumTo);    
      } else if(finishDateType == "finishLateTo"){
        finishDate = new Date(this.roadWorkNeedFeature.properties.finishLateTo);
      }
      if(finishDate){
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
      this.documentService.uploadDocument(this.roadWorkNeedFeature.properties.uuid, formData).subscribe({
        next: (errorObj) => {
          ErrorMessageEvaluation._evaluateErrorMessage(errorObj);
          if (errorObj.errorMessage.trim().length !== 0) {
            this.snckBar.open(errorObj.errorMessage, "", {
              duration: 4000
            });
          } else {
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

  downloadPdf() {
    if (this.roadWorkNeedFeature) {
      this.documentService.getDocument(this.roadWorkNeedFeature.properties.uuid).subscribe({
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

  switchShowRelevanceInfo(){
    this.showRelevanceInfo = !this.showRelevanceInfo;
    if(!this.roadWorkNeedFeature || this.roadWorkNeedFeature.properties.relevance < 0)
      this.showRelevanceInfo = false;
  }

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
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

  private static _createNewRoadWorkNeedFeature(user: User): RoadWorkNeedFeature {

    let roadWorkNeedFeature: RoadWorkNeedFeature = new RoadWorkNeedFeature();
    roadWorkNeedFeature.properties.status.code = "requirement";
    roadWorkNeedFeature.properties.priority.code = "middle";
    roadWorkNeedFeature.properties.isEditingAllowed = true;
    roadWorkNeedFeature.properties.isPrivate = true;
    roadWorkNeedFeature.properties.created = new Date();
    roadWorkNeedFeature.properties.lastModified = new Date();
    roadWorkNeedFeature.properties.orderer = user;

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
