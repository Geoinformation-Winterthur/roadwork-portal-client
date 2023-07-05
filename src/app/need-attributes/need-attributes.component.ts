/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { ManagementAreaFeature } from 'src/model/management-area-feature';

@Component({
  selector: 'app-need-attributes',
  templateUrl: './need-attributes.component.html',
  styleUrls: ['./need-attributes.component.css']
})
export class NeedAttributesComponent implements OnInit {

  roadWorkNeedFeature?: RoadWorkNeedFeature;
  orderer: User = new User();
  ordererOrgUnitName: string = "";
  areaManagerName: string = "";
  statusCode: string = "";
  priorityCode: string = "";

  userService: UserService;

  roadWorkNeedEnumControl: FormControl = new FormControl();
  availableRoadWorkNeedEnums: RoadWorkNeedEnum[] = [];

  private roadWorkNeedService: RoadWorkNeedService;
  private activatedRoute: ActivatedRoute;
  private activatedRouteSubscription: Subscription = new Subscription();

  private snckBar: MatSnackBar;

  constructor(activatedRoute: ActivatedRoute, roadWorkNeedService: RoadWorkNeedService,
    userService: UserService, snckBar: MatSnackBar) {
    this.activatedRoute = activatedRoute;
    this.roadWorkNeedService = roadWorkNeedService;
    this.userService = userService;
    this.snckBar = snckBar;
  }

  ngOnInit() {
    this.activatedRouteSubscription = this.activatedRoute.params
      .subscribe(params => {
        let idParamString: string = params['id'];

        if (idParamString == "new") {

          this.roadWorkNeedFeature = NeedAttributesComponent.
                _createNewRoadWorkNeedFeature(this.userService.getLocalUser());

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

  add() {
    this.roadWorkNeedService.addRoadworkNeed(this.roadWorkNeedFeature)
      .subscribe({
        next: (roadWorkNeedFeature) => {
          if (this.roadWorkNeedFeature) {
            ErrorMessageEvaluation._evaluateErrorMessage(roadWorkNeedFeature);
            if (roadWorkNeedFeature.errorMessage.trim().length !== 0) {
              this.snckBar.open(roadWorkNeedFeature.errorMessage, "", {
                duration: 4000
              });
            }
            this.roadWorkNeedFeature.properties.uuid = roadWorkNeedFeature.properties.uuid;
            this.roadWorkNeedFeature.properties.name = roadWorkNeedFeature.properties.name;
            this.roadWorkNeedFeature.properties.orderer = roadWorkNeedFeature.properties.orderer;
            this.roadWorkNeedFeature.properties.managementarea = roadWorkNeedFeature.properties.managementarea;

          }
        },
        error: (error) => {
        }
      });
  }

  update() {
    if (this.roadWorkNeedFeature && this.roadWorkNeedFeature.properties.uuid) {
      this.roadWorkNeedService.updateRoadWorkNeed(this.roadWorkNeedFeature)
        .subscribe({
          next: (roadWorkNeedFeature) => {
            if (this.roadWorkNeedFeature) {
              ErrorMessageEvaluation._evaluateErrorMessage(roadWorkNeedFeature);
              if (roadWorkNeedFeature.errorMessage.trim().length !== 0) {
                this.snckBar.open(roadWorkNeedFeature.errorMessage, "", {
                  duration: 4000
                });
              }
              this.roadWorkNeedFeature.properties.managementarea = roadWorkNeedFeature.properties.managementarea;
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

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
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
    roadWorkNeedFeature.properties.status.code = "notcoord";
    roadWorkNeedFeature.properties.priority.code = "middle";
    roadWorkNeedFeature.properties.isEditingAllowed = true;
    roadWorkNeedFeature.properties.created = new Date();
    roadWorkNeedFeature.properties.lastModified = new Date();

    let userForRoadWorkNeed: User = new User();
    userForRoadWorkNeed.lastName = localUser.lastName;
    userForRoadWorkNeed.firstName = localUser.firstName;
    let organisation: OrganisationalUnit = new OrganisationalUnit();
    organisation.name = "Noch nicht ermittelt";
    userForRoadWorkNeed.organisationalUnit = organisation;

    roadWorkNeedFeature.properties.orderer = userForRoadWorkNeed;

    let managementarea: ManagementAreaFeature = new ManagementAreaFeature();
    let managerForRoadWorkNeed: User = new User();
    managerForRoadWorkNeed.lastName = "Noch nicht ermittelt";
    managementarea.properties.manager = managerForRoadWorkNeed;

    roadWorkNeedFeature.properties.managementarea = managementarea;

    let plus50Years: Date = new Date();
    plus50Years.setFullYear(plus50Years.getFullYear() + 50);

    roadWorkNeedFeature.properties.finishEarlyFrom = new Date();
    roadWorkNeedFeature.properties.finishEarlyTo = plus50Years;

    roadWorkNeedFeature.properties.finishOptimumFrom = new Date();
    roadWorkNeedFeature.properties.finishOptimumTo = plus50Years;

    roadWorkNeedFeature.properties.finishLateFrom = new Date();
    roadWorkNeedFeature.properties.finishLateTo = plus50Years;

    return roadWorkNeedFeature;

  }

}
