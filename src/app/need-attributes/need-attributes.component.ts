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
import { OrganisationalUnit } from 'src/model/organisational-unit';
import { ManagementArea } from 'src/model/management-area';
import { ManagementAreaService } from 'src/services/management-area.service';
import { DateHelper } from 'src/helper/date-helper';
import { DocumentService } from 'src/services/document.service';
import { environment } from 'src/environments/environment';
import { ValidationHandler } from 'angular-oauth2-oidc';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';

@Component({
  selector: 'app-need-attributes',
  templateUrl: './need-attributes.component.html',
  styleUrls: ['./need-attributes.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class NeedAttributesComponent implements OnInit {

  finishOptimumTertial: number = 0;
  finishEarlyTertial: number = 0;
  finishLateTertial: number = 0;

  roadWorkNeedFeature?: RoadWorkNeedFeature;
  managementArea?: ManagementArea;
  orderer: User = new User();
  ordererOrgUnitName: string = "";
  areaManagerName: string = "";
  statusCode: string = "";
  priorityCode: string = "";

  environment = environment;

  userService: UserService;

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
  private documentService: DocumentService;
  private activatedRoute: ActivatedRoute;
  private router: Router;
  private activatedRouteSubscription: Subscription = new Subscription();

  private snckBar: MatSnackBar;

  constructor(activatedRoute: ActivatedRoute,
    roadWorkNeedService: RoadWorkNeedService,
    roadWorkActivityService: RoadWorkActivityService,
    documentService: DocumentService,
    userService: UserService, snckBar: MatSnackBar,
    managementAreaService: ManagementAreaService,
    router: Router) {
    this.activatedRoute = activatedRoute;
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
    this.documentService = documentService;
    this.managementAreaService = managementAreaService;
    this.userService = userService;
    this.router = router;
    this.snckBar = snckBar;
  }

  ngOnInit() {
    this.activatedRouteSubscription = this.activatedRoute.params
      .subscribe(params => {
        let idParamString: string = params['id'];

        if (idParamString == "new") {
          this.roadWorkNeedFeature = NeedAttributesComponent.
            _createNewRoadWorkNeedFeature(this.userService.getLocalUser());
          this.managementArea = NeedAttributesComponent.
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

                    this.finishOptimumTertial = this._convertDateToTertialCount(this.roadWorkNeedFeature.properties.finishOptimumTo);
                    this.finishEarlyTertial = this._convertDateToTertialCount(this.roadWorkNeedFeature.properties.finishEarlyTo);
                    this.finishLateTertial = this._convertDateToTertialCount(this.roadWorkNeedFeature.properties.finishLateTo);
                  }

                  this.managementAreaService.getIntersectingManagementAreas(roadWorkNeedFeature.geometry)
                    .subscribe({
                      next: (managementAreas) => {
                        if (managementAreas && managementAreas.length !== 0) {
                          this.managementArea = managementAreas[0];
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
            if (this.roadWorkNeedFeature) {
              ErrorMessageEvaluation._evaluateErrorMessage(roadWorkNeedFeature);
              if (roadWorkNeedFeature.errorMessage.trim().length !== 0) {
                this.roadWorkNeedFeature.properties.isPrivate = true;
                this.snckBar.open(roadWorkNeedFeature.errorMessage, "", {
                  duration: 4000
                });
              } else {
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
    if (this.finishEarlyTertial > this.finishOptimumTertial)
      this.finishOptimumTertial = this.finishEarlyTertial;
    if (this.finishOptimumTertial > this.finishLateTertial)
      this.finishLateTertial = this.finishOptimumTertial;

    this.roadWorkNeedFeature!.properties.finishOptimumTo =
      this._convertTertialToDate(this.finishOptimumTertial);
    this.roadWorkNeedFeature!.properties.finishEarlyTo =
      this._convertTertialToDate(this.finishEarlyTertial);
    this.roadWorkNeedFeature!.properties.finishLateTo =
      this._convertTertialToDate(this.finishLateTertial);

    this.roadWorkNeedFeature!.properties.url = this.urlControl.value;

    if (this.roadWorkNeedFeature && this.roadWorkNeedFeature.properties.uuid) {
      this.managementAreaService.getIntersectingManagementAreas(this.roadWorkNeedFeature.geometry)
        .subscribe({
          next: (managementAreas) => {
            if (managementAreas && managementAreas.length !== 0) {

              this.roadWorkNeedService.updateRoadWorkNeed(this.roadWorkNeedFeature)
                .subscribe({
                  next: (roadWorkNeedFeature) => {
                    if (this.roadWorkNeedFeature) {
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
                        this.managementArea = managementAreas[0];
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
    if(this.roadWorkNeedFeature){
      let roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();
      roadWorkActivity.geometry = this.roadWorkNeedFeature.geometry;
      roadWorkActivity.properties.name = this.roadWorkNeedFeature.properties.name;
      roadWorkActivity.properties.roadWorkNeedsUuids.push(this.roadWorkNeedFeature.properties.uuid);
      roadWorkActivity.properties.costsType.code = "valuation";
      roadWorkActivity.properties.costs = this.roadWorkNeedFeature.properties.costs;
      roadWorkActivity.properties.finishTo = this.roadWorkNeedFeature.properties.finishOptimumTo;
  
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

  writeOutTertial(tertialCount: number): string {
    let result: string = "";
    let currentDate: Date = new Date();

    let currentMonth: number = currentDate.getMonth() + 1;
    let currentTertial: number = Math.ceil(currentMonth / 4);
    let tertialModulo: number = (currentTertial + tertialCount) % 3;

    if (tertialModulo === 1) {
      result += "1. Tertial ";
    } else if (tertialModulo === 2) {
      result += "2. Tertial ";
    } else {
      result += "3. Tertial ";
    }

    let currentYear: number = currentDate.getFullYear();

    let addYears = 0;
    if (tertialCount) {
      addYears = Math.floor(tertialCount / 3);
    }

    result += " " + (currentYear + addYears);

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

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
  }

  private _convertTertialToDate(tertialCount: number): Date {
    let result: Date = new Date();
    let currentDate: Date = new Date();

    let currentMonth: number = currentDate.getMonth() + 1;
    let currentTertial: number = Math.ceil(currentMonth / 4);
    let tertialModulo: number = (currentTertial + tertialCount) % 3;

    if (tertialModulo === 1) {
      result.setMonth(1);
    } else if (tertialModulo === 2) {
      result.setMonth(4);
    } else {
      result.setMonth(8);
    }

    let currentYear: number = currentDate.getFullYear();

    let addYears = 0;
    if (tertialCount) {
      addYears = Math.floor(tertialCount / 3);
    }

    result.setFullYear(currentYear + addYears);

    result.setDate(1);

    return result;
  }

  private _convertDateToTertialCount(realizationDate: Date): number {
    let currentDate: Date = new Date();
    realizationDate = new Date(realizationDate);
    let monthDiff = DateHelper.calcMonthDiff(currentDate, realizationDate);
    return Math.ceil(monthDiff / 4);
  }

  private static _createNewRoadWorkNeedFeature(localUser: User): RoadWorkNeedFeature {

    let roadWorkNeedFeature: RoadWorkNeedFeature = new RoadWorkNeedFeature();
    roadWorkNeedFeature.properties.status.code = "requirement";
    roadWorkNeedFeature.properties.priority.code = "middle";
    roadWorkNeedFeature.properties.isEditingAllowed = true;
    roadWorkNeedFeature.properties.isPrivate = true;
    roadWorkNeedFeature.properties.created = new Date();
    roadWorkNeedFeature.properties.lastModified = new Date();

    let userForRoadWorkNeed: User = new User();
    userForRoadWorkNeed.lastName = localUser.lastName;
    userForRoadWorkNeed.firstName = localUser.firstName;
    let organisation: OrganisationalUnit = new OrganisationalUnit();
    organisation.name = "Noch nicht ermittelt";
    userForRoadWorkNeed.organisationalUnit = organisation;

    roadWorkNeedFeature.properties.orderer = userForRoadWorkNeed;

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
