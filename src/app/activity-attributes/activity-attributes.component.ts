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
import { RoadWorkNeedEnum } from 'src/model/road-work-need-enum';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';

@Component({
  selector: 'app-activity-attributes',
  templateUrl: './activity-attributes.component.html',
  styleUrls: ['./activity-attributes.component.css']
})
export class ActivityAttributesComponent implements OnInit {

  roadWorkActivityFeature?: RoadWorkActivityFeature;
  roadWorkNeeds: RoadWorkNeedFeature[] = [];

  orderer: User = new User();
  ordererOrgUnitName: string = "";
  areaManagerName: string = "";
  statusCode: string = "";
  priorityCode: string = "";

  userService: UserService;

  roadWorkActivityEnumControl: FormControl = new FormControl();
  availableRoadWorkActivityEnums: RoadWorkNeedEnum[] = [];

  private roadWorkActivityService: RoadWorkActivityService;
  private roadWorkNeedService: RoadWorkNeedService;
  private activatedRoute: ActivatedRoute;
  private activatedRouteSubscription: Subscription = new Subscription();

  constructor(activatedRoute: ActivatedRoute, roadWorkActivityService: RoadWorkActivityService,
    roadWorkNeedService: RoadWorkNeedService, userService: UserService) {
    this.activatedRoute = activatedRoute;
    this.roadWorkActivityService = roadWorkActivityService;
    this.roadWorkNeedService = roadWorkNeedService;
    this.userService = userService;
  }

  ngOnInit() {
    this.activatedRouteSubscription = this.activatedRoute.params
      .subscribe(params => {
        let idParamString: string = params['id'];

        if (idParamString == "new") {

          this.roadWorkActivityFeature = new RoadWorkActivityFeature();

        } else {

          let constProjId: string = params['id'];

          this.roadWorkActivityService.getRoadWorkActivities(constProjId)
            .subscribe({
              next: (roadWorkActivities) => {
                if (roadWorkActivities.length === 1) {
                  let roadWorkActivity: any = roadWorkActivities[0];
                  let rwPoly: RoadworkPolygon = new RoadworkPolygon();
                  rwPoly.coordinates = roadWorkActivity.geometry.coordinates
                  roadWorkActivity.geometry = rwPoly;
                  this.roadWorkActivityFeature = roadWorkActivity;
                  if(this.roadWorkActivityFeature?.properties.roadWorkNeedsUuids.length !== 0){
                    this.roadWorkNeedService.getRoadWorkNeeds(this.roadWorkActivityFeature?.properties.roadWorkNeedsUuids)
                    .subscribe({
                      next: (roadWorkNeeds) => {
                        this.roadWorkNeeds = roadWorkNeeds;
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
            this.roadWorkActivityFeature.properties.uuid = roadWorkActivityFeature.properties.uuid;
          }
        },
        error: (error) => {
        }
      });
  }

  update() {
    if (this.roadWorkActivityFeature && this.roadWorkActivityFeature.properties.uuid) {
      this.roadWorkActivityService.updateRoadWorkActivity(this.roadWorkActivityFeature)
        .subscribe({
          next: (roadWorkActivityFeature) => {
            if (this.roadWorkActivityFeature) {
              this.roadWorkActivityFeature.properties.managementarea = roadWorkActivityFeature.properties.managementarea;
            }
          },
          error: (error) => {
          }
        });
    }
  }

  validateElement1() {
    let validateButton1 = document.getElementById("validateButton1");
    if (validateButton1 != null)
      validateButton1.style.backgroundColor = "lightgreen";
    let expansionPanel1 = document.getElementById("expansionPanel1");
    if (expansionPanel1 != null)
      expansionPanel1.style.backgroundColor = "rgb(238, 255, 238)";
  }

  validateElement3() {
    let validateButton3 = document.getElementById("validateButton3");
    if (validateButton3 != null)
      validateButton3.style.backgroundColor = "lightgreen";
    let expansionPanel3 = document.getElementById("expansionPanel3");
    if (expansionPanel3 != null)
      expansionPanel3.style.backgroundColor = "rgb(238, 255, 238)";
    // this.validateElement2();
  }

  validateElement4() {
    let validateButton4 = document.getElementById("validateButton4");
    if (validateButton4 != null)
      validateButton4.style.backgroundColor = "lightgreen";
    let expansionPanel4 = document.getElementById("expansionPanel4");
    if (expansionPanel4 != null)
      expansionPanel4.style.backgroundColor = "rgb(238, 255, 238)";
    this.validateElement2();
  }

  validateElement2() {
    let validateButton3 = document.getElementById("validateButton3");
    let validateButton4 = document.getElementById("validateButton4");
    if (validateButton3 != null && validateButton3.style.backgroundColor === "lightgreen" &&
      validateButton4 != null && validateButton4.style.backgroundColor === "lightgreen") {
      let expansionPanel2 = document.getElementById("expansionPanel2");
      if (expansionPanel2 != null)
        expansionPanel2.style.backgroundColor = "rgb(238, 255, 238)";
    }
  }

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
  }

}
