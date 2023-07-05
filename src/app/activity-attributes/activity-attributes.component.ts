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
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';

@Component({
  selector: 'app-activity-attributes',
  templateUrl: './activity-attributes.component.html',
  styleUrls: ['./activity-attributes.component.css']
})
export class ActivityAttributesComponent implements OnInit {

  roadWorkActivityFeature?: RoadWorkActivityFeature;

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
  private activatedRoute: ActivatedRoute;
  private activatedRouteSubscription: Subscription = new Subscription();

  constructor(activatedRoute: ActivatedRoute, roadWorkActivityService: RoadWorkActivityService,
    needsOfActivityService: NeedsOfActivityService,
    roadWorkNeedService: RoadWorkNeedService, userService: UserService) {
    this.activatedRoute = activatedRoute;
    this.roadWorkActivityService = roadWorkActivityService;
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.userService = userService;
  }

  ngOnInit() {
    this.activatedRouteSubscription = this.activatedRoute.params
      .subscribe(params => {
        let idParamString: string = params['id'];

        if (idParamString == "new") {

          this.roadWorkActivityFeature = new RoadWorkActivityFeature();
          this.roadWorkActivityFeature.properties.status.code = "inwork";

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
                  this.roadWorkActivityStatusEnumControl.setValue(roadWorkActivity.properties.status.code);
                  if (this.roadWorkActivityFeature?.properties.roadWorkNeedsUuids.length !== 0) {
                    this.roadWorkNeedService.getRoadWorkNeeds(this.roadWorkActivityFeature?.properties.roadWorkNeedsUuids)
                      .subscribe({
                        next: (roadWorkNeeds) => {
                          this.needsOfActivityService.roadWorkNeeds = roadWorkNeeds;
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

  onRoadWorkActivityStatusEnumChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.status.code = this.roadWorkActivityStatusEnumControl.value;
    }
  }

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
  }

}
