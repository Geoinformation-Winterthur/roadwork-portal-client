/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
import { User } from 'src/model/user';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { FormControl } from '@angular/forms';
import { RoadWorkNeedEnum } from 'src/model/road-work-need-enum';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { OrganisationalUnit } from 'src/model/organisational-unit';
import { ManagementArea } from 'src/model/management-area';
import { ManagementAreaService } from 'src/services/management-area.service';
import { DateHelper } from 'src/helper/date-helper';

@Component({
  selector: 'app-need-attributes',
  templateUrl: './need-attributes.component.html',
  styleUrls: ['./need-attributes.component.css']
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

  userService: UserService;

  roadWorkNeedEnumControl: FormControl = new FormControl();
  availableRoadWorkNeedEnums: RoadWorkNeedEnum[] = [];

  private roadWorkNeedService: RoadWorkNeedService;
  private managementAreaService: ManagementAreaService;
  private activatedRoute: ActivatedRoute;
  private router: Router;
  private activatedRouteSubscription: Subscription = new Subscription();

  private snckBar: MatSnackBar;

  constructor(activatedRoute: ActivatedRoute, roadWorkNeedService: RoadWorkNeedService,
    userService: UserService, snckBar: MatSnackBar,
    managementAreaService: ManagementAreaService,
    router: Router) {
    this.activatedRoute = activatedRoute;
    this.roadWorkNeedService = roadWorkNeedService;
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

                  if (!this._hasRoadWorkNeedKindEnumElementAlready(roadWorkNeedFeature.properties.kind)) {
                    this.availableRoadWorkNeedEnums.push(roadWorkNeedFeature.properties.kind);
                  }
                  this.roadWorkNeedEnumControl.setValue(roadWorkNeedFeature.properties.kind.code);
                }
              },
              error: (error) => {
              }
            });

        }

      });

    this.roadWorkNeedService.getAllTypes().subscribe({
      next: (roadWorkNeedTypes) => {
        for (let roadWorkNeedType of roadWorkNeedTypes) {
          if (!this._hasRoadWorkNeedKindEnumElementAlready(roadWorkNeedType)) {
            this.availableRoadWorkNeedEnums.push(roadWorkNeedType);
          }
        }
      },
      error: (error) => {
      }
    });

  }

  add(isPrivate: boolean) {
    if (this.roadWorkNeedFeature) {
      this.roadWorkNeedFeature.properties.isPrivate = isPrivate;
      this.roadWorkNeedService.addRoadworkNeed(this.roadWorkNeedFeature)
        .subscribe({
          next: (roadWorkNeedFeature) => {
            if (this.roadWorkNeedFeature) {
              ErrorMessageEvaluation._evaluateErrorMessage(roadWorkNeedFeature);
              if (roadWorkNeedFeature.errorMessage.trim().length !== 0) {
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
          }
        });

    }
  }

  update() {
    if (this.finishEarlyTertial > this.finishOptimumTertial)
      this.finishOptimumTertial = this.finishEarlyTertial;
    if (this.finishOptimumTertial > this.finishLateTertial)
      this.finishLateTertial = this.finishOptimumTertial;

    if (this.roadWorkNeedFeature && this.roadWorkNeedFeature.properties.uuid) {
      this.managementAreaService.getIntersectingManagementAreas(this.roadWorkNeedFeature.geometry)
        .subscribe({
          next: (managementAreas) => {
            if (managementAreas && managementAreas.length !== 0) {

              this.roadWorkNeedFeature!.properties.finishOptimumTo =
                this._convertTertialToDate(this.finishOptimumTertial);
              this.roadWorkNeedFeature!.properties.finishEarlyTo =
                this._convertTertialToDate(this.finishEarlyTertial);
              this.roadWorkNeedFeature!.properties.finishLateTo =
                this._convertTertialToDate(this.finishLateTertial);
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

  onRoadWorkNeedEnumChange() {
    if (this.roadWorkNeedFeature) {
      this.roadWorkNeedFeature.properties.kind.code = this.roadWorkNeedEnumControl.value;
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

  private _hasRoadWorkNeedKindEnumElementAlready(roadWorkNeedEnum: RoadWorkNeedEnum): boolean {
    for (let availableRoadWorkNeedEnum of this.availableRoadWorkNeedEnums) {
      if (availableRoadWorkNeedEnum.code === roadWorkNeedEnum.code) {
        return true;
      }
    }
    return false;
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

    let plus50Years: Date = new Date();
    plus50Years.setFullYear(plus50Years.getFullYear() + 50);

    roadWorkNeedFeature.properties.finishEarlyTo = plus50Years;
    roadWorkNeedFeature.properties.finishOptimumTo = plus50Years;
    roadWorkNeedFeature.properties.finishLateTo = plus50Years;

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
