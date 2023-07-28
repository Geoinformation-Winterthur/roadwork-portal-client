/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
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
  appVersion: string = "2023.07.28";

  displayedColumns: string[] = ['name', 'manager', 'created', 'period'];

  constructor(userService: UserService, roadWorkActivityService: RoadWorkActivityService) {
    this.userService = userService;
    this.roadWorkActivityService = roadWorkActivityService;
  }

  ngOnInit(): void {
    if (this.userService.isUserLoggedIn()) {
      this.roadWorkActivityService.getRoadWorkActivities("", "inconsult").subscribe({
        next: (roadWorkActivities) => {
          this.roadWorkActivityFeaturesInCoordination = roadWorkActivities;
        },
        error: (error) => {
        }
      });
    }
  }

}
