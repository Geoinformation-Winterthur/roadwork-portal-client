/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { ManagementAreaService } from 'src/services/management-area.service';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { UserService } from 'src/services/user.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
/**
 * The WelcomeComponent is the component for the start
 * page of the roadworks-portal web application.
 */
export class WelcomeComponent implements OnInit {

  roadWorkActivityFeaturesInCoordination: RoadWorkActivityFeature[] = [];

  userService: UserService;
  roadWorkActivityService: RoadWorkActivityService;
  appVersion: string = "2023.11.24";

  displayedColumns: string[] = ['name', 'manager', 'created', 'period'];

  private managementAreaService: ManagementAreaService;

  constructor(userService: UserService, roadWorkActivityService: RoadWorkActivityService,
        managementAreaService: ManagementAreaService) {
    this.userService = userService;
    this.roadWorkActivityService = roadWorkActivityService;
    this.managementAreaService = managementAreaService;
  }

  ngOnInit(): void {
    if (this.userService.isUserLoggedIn()) {
      this.roadWorkActivityService.getRoadWorkActivities("", "inconsult").subscribe({
        next: (roadWorkActivities) => {
          for(let roadWorkActInCoordination of roadWorkActivities){
            this.managementAreaService.getIntersectingManagementAreas(roadWorkActInCoordination.geometry)
            .subscribe({
              next: (managementAreas) => {
                if (managementAreas && managementAreas.length !== 0) {
                  roadWorkActInCoordination.properties.areaManager = managementAreas[0].manager;
                }
              },
              error: (error) => {
              }
            });
          }
          this.roadWorkActivityFeaturesInCoordination = roadWorkActivities;
        },
        error: (error) => {
        }
      });
    }
  }

}
