/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { User } from 'src/model/user';
import { ManagementAreaService } from 'src/services/management-area.service';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { UserService } from 'src/services/user.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
  encapsulation: ViewEncapsulation.None
})
/**
 * The WelcomeComponent is the component for the start
 * page of the roadworks-portal web application.
 */
export class WelcomeComponent implements OnInit {

  roadWorkActivityFeaturesInCoordination: RoadWorkActivityFeature[] = [];

  user: User = new User();
  userService: UserService;

  roadWorkActivityService: RoadWorkActivityService;
  appVersion: string = "2024.20";

  displayedColumns: string[] = ['name', 'manager', 'created', 'period'];

  private managementAreaService: ManagementAreaService;
  private snckBar: MatSnackBar;

  constructor(userService: UserService, roadWorkActivityService: RoadWorkActivityService,
    managementAreaService: ManagementAreaService, snckBar: MatSnackBar) {
    this.userService = userService;
    this.roadWorkActivityService = roadWorkActivityService;
    this.managementAreaService = managementAreaService;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    if (this.userService.isUserLoggedIn()) {

      this.roadWorkActivityService.getRoadWorkActivities("", "inconsult,reporting").subscribe({
        next: (roadWorkActivities) => {
          for (let roadWorkActInCoordination of roadWorkActivities) {
            this.managementAreaService.getIntersectingManagementArea(roadWorkActInCoordination.geometry)
              .subscribe({
                next: (managementArea) => {
                  if (managementArea) {
                    roadWorkActInCoordination.properties.areaManager = managementArea.manager;
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

      let localUser: User = this.userService.getLocalUser();

      this.userService.getUserFromDB(localUser.mailAddress)
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
                this.user.chosenRole = localUser.chosenRole;
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
  }

  update(changePassphrase: boolean = false) {
    this.user.passPhrase = this.user.passPhrase.trim();
    if (changePassphrase && this.user.passPhrase.length == 0) {
      this.snckBar.open("Bitte Passphrase eingeben", "", {
        duration: 4000
      });
    } else {
      this.userService.updateUser(this.user, changePassphrase)
        .subscribe({
          next: (errorMessage) => {
            ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
            if (errorMessage && errorMessage.errorMessage &&
              errorMessage.errorMessage.trim().length !== 0) {
              this.snckBar.open(errorMessage.errorMessage, "", {
                duration: 4000
              });
            } else {
              this.snckBar.open("Einstellungen erfolgreich geändert", "", {
                duration: 4000
              });
            }
          },
          error: (error) => {
            this.snckBar.open("Beim Laden von Benutzerdaten ist ein Systemfehler aufgetreten. Bitte wenden Sie sich an den Administrator.", "", {
              duration: 4000
            });
          }
        });
    }
  }


}
