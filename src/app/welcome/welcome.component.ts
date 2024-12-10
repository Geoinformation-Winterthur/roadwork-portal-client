/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
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

  roadWorkNeedColumns: string[] = ['name', 'territorymanager', 'orderer', 'orderer_org', 'description', 'status', 'created', 'last_modified'];
  roadWorkActivityColumns: string[] = ['name', 'territorymanager', 'lead', 'involved', 'status', 'optimum_date', 'due_date'];

  user: User = new User();
  userService: UserService;

  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;
  appVersion: string = "2024.32";

  involvedOrgs: Map<string, OrganisationalUnit>;

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
    let loggedInUser: User = this.userService.getLocalUser();
    if (this.userService.isUserLoggedIn()) {

      this.roadWorkNeedService.getRoadWorkNeeds().subscribe({
        next: (roadWorkNeeds) => {
          let myRoadWorkNeeds: Map<string, RoadWorkNeedFeature> = new Map();
          for (let roadWorkNeed of roadWorkNeeds) {

            this.managementAreaService.getIntersectingManagementArea(roadWorkNeed.geometry)
              .subscribe({
                next: (managementArea) => {
                  if (managementArea) {
                    roadWorkNeed.properties.managementArea = managementArea;
                  }
                },
                error: (error) => {
                }
              });

            if (roadWorkNeed.properties.status != "coordinated")
              if (roadWorkNeed.properties.orderer.uuid == loggedInUser.uuid)
                myRoadWorkNeeds.set(roadWorkNeed.properties.uuid, roadWorkNeed);
          }
          this.myRoadWorkNeedFeatures = Array.from(myRoadWorkNeeds.values());
        },
        error: (error) => {
        }
      });

      this.roadWorkActivityService
        .getRoadWorkActivities("", "requirement,review,inconsult,reporting,verified").subscribe({
          next: (roadWorkActivities) => {
            for (let activeRoadWorkAct of roadWorkActivities) {
              this.managementAreaService.getIntersectingManagementArea(activeRoadWorkAct.geometry)
                .subscribe({
                  next: (managementArea) => {
                    if (managementArea) {
                      activeRoadWorkAct.properties.areaManager = managementArea.manager;
                    }
                  },
                  error: (error) => {
                  }
                });
            }
            let myRoadWorkActivities: Map<string, RoadWorkActivityFeature> = new Map();
            for (let roadWorkActivity of roadWorkActivities) {
              if (roadWorkActivity.properties.areaManager) {
                if (roadWorkActivity.properties.areaManager.uuid == loggedInUser.uuid)
                  myRoadWorkActivities.set(roadWorkActivity.properties.uuid, roadWorkActivity);
                else if (roadWorkActivity.properties.projectManager.uuid = loggedInUser.uuid)
                  myRoadWorkActivities.set(roadWorkActivity.properties.uuid, roadWorkActivity);
              }

              this.myRoadWorkActivityFeatures = Array.from(myRoadWorkActivities.values());
              // prepare involvedOrgs:
              for (let roadWorkActivityFeature of this.myRoadWorkActivityFeatures) {
                for (let involvedUser of roadWorkActivityFeature.properties.involvedUsers) {
                  this.involvedOrgs.set(involvedUser.organisationalUnit.uuid, involvedUser.organisationalUnit);
                }
              }

              this.roadWorkNeedService.getRoadWorkNeeds(roadWorkActivity.properties.roadWorkNeedsUuids).subscribe({
                next: (roadWorkNeeds) => {
                  for (let roadWorkNeed of roadWorkNeeds) {
                    if (roadWorkNeed.properties.status != "coordinated")
                      if (roadWorkNeed.properties.orderer.uuid == loggedInUser.uuid)
                        myRoadWorkActivities.set(roadWorkActivity.properties.uuid, roadWorkActivity);
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

  getColorDueDate(roadworkActivity: RoadWorkActivityFeature): string {
    if (roadworkActivity) {
      const today: Date = new Date();
      const dueDate = this._calcDueDate(roadworkActivity);
      if (dueDate) {
        let threeDaysBeforeDue: Date = new Date(dueDate);
        threeDaysBeforeDue.setDate(dueDate.getDate() - 3);
        let oneDayAfterDue = new Date(dueDate);
        oneDayAfterDue.setDate(dueDate.getDate() + 1);
        if (today >= oneDayAfterDue)
          return "background-color: rgb(255, 109, 109);";
        else if (today >= threeDaysBeforeDue)
          return "background-color: rgb(255, 194, 109);";
      }
    }
    return "background-color: rgb(109, 255, 121);";
  }

  openWinWebGIS(){
    window.open("http://intramap.winport.net/projekte/tiefbau_info/start_redirect.php", "_blank");
  }

  private _calcDueDate(roadworkActivity: RoadWorkActivityFeature): Date | undefined {
    let result = undefined;
    if (roadworkActivity.properties.status == "inconsult" ||
      roadworkActivity.properties.status == "verified") {
      if (roadworkActivity.properties.dateConsultEnd)
        result = new Date(roadworkActivity.properties.dateConsultEnd);
    } else if (roadworkActivity.properties.status == "reporting") {
      if (roadworkActivity.properties.dateReportEnd)
        result = roadworkActivity.properties.dateReportEnd;
    } else if (roadworkActivity.properties.status == "coordinated") {
      if (roadworkActivity.properties.dateInfoEnd)
        result = roadworkActivity.properties.dateInfoEnd;
    } else {
      result = new Date();
      result.setDate(result.getDate() + 7);
    }
    return result;
  }


}
