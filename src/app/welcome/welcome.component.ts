/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { OrganisationalUnit } from 'src/model/organisational-unit';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { User } from 'src/model/user';
import { ManagementAreaService } from 'src/services/management-area.service';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
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

  myRoadWorkNeedFeatures: RoadWorkNeedFeature[] = [];
  myRoadWorkActivityFeatures: RoadWorkActivityFeature[] = [];

  user: User = new User();
  userService: UserService;

  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;
  appVersion: string = "2024.25";

  involvedOrgs: Map<string, OrganisationalUnit>;
  displayedColumns: string[] = ['name', 'territorymanager', 'lead', 'involved', 'status', 'optimum_date', 'due_date'];

  private managementAreaService: ManagementAreaService;
  private snckBar: MatSnackBar;

  constructor(userService: UserService, roadWorkActivityService: RoadWorkActivityService,
    roadWorkNeedService: RoadWorkNeedService,
    managementAreaService: ManagementAreaService, snckBar: MatSnackBar) {
    this.userService = userService;
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
    this.managementAreaService = managementAreaService;
    this.snckBar = snckBar;    
    this.involvedOrgs = new Map();
  }

  ngOnInit(): void {
    let loggedInuser: User = this.userService.getLocalUser();
    if (this.userService.isUserLoggedIn()) {

      this.roadWorkNeedService.getRoadWorkNeeds().subscribe({
    next: (roadWorkNeeds) => {
      let myRoadWorkNeeds: Map<string, RoadWorkNeedFeature> = new Map();
      for (let roadWorkNeed of roadWorkNeeds) {
        if(roadWorkNeed.properties.status == "requirement")
          if(roadWorkNeed.properties.orderer.uuid == loggedInuser.uuid)
            myRoadWorkNeeds.set(roadWorkNeed.properties.uuid, roadWorkNeed);
      }
      this.myRoadWorkNeedFeatures = Array.from(myRoadWorkNeeds.values());

      // prepare involvedOrgs:
      for (let roadWorkActivityFeature of this.myRoadWorkActivityFeatures) {
        for (let involvedUser of roadWorkActivityFeature.properties.involvedUsers) {
          this.involvedOrgs.set(involvedUser.organisationalUnit.uuid, involvedUser.organisationalUnit);
        }
      }

    },
    error: (error) => {
    }
  });

      this.roadWorkActivityService
          .getRoadWorkActivities("", "requirement,review,inconsult,reporting,verified").subscribe({
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
          let myRoadWorkActivities: Map<string, RoadWorkActivityFeature> = new Map();
          for(let roadWorkActivity of roadWorkActivities){
            if(roadWorkActivity.properties.areaManager.uuid = loggedInuser.uuid)
              myRoadWorkActivities.set(roadWorkActivity.properties.uuid, roadWorkActivity);
            else if(roadWorkActivity.properties.projectManager.uuid = loggedInuser.uuid)
              myRoadWorkActivities.set(roadWorkActivity.properties.uuid, roadWorkActivity);

            for(let roadWorkNeedsUuid of roadWorkActivity.properties.roadWorkNeedsUuids){

            }
          }
          this.myRoadWorkActivityFeatures = Array.from(myRoadWorkActivities.values());

          // prepare involvedOrgs:
          for (let roadWorkActivityFeature of this.myRoadWorkActivityFeatures) {
            for (let involvedUser of roadWorkActivityFeature.properties.involvedUsers) {
              this.involvedOrgs.set(involvedUser.organisationalUnit.uuid, involvedUser.organisationalUnit);
            }
          }

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
