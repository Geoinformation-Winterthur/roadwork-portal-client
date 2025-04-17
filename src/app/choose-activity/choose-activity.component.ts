/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkActivityFeature } from '../../model/road-work-activity-feature';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from 'src/services/user.service';
import { User } from 'src/model/user';
import { ManagementAreaService } from 'src/services/management-area.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-choose-activity',
  templateUrl: './choose-activity.component.html',
  styleUrls: ['./choose-activity.component.css']
})
export class ChooseActivityComponent implements OnInit {

  roadWorkActivityFeatures: RoadWorkActivityFeature[] = [];
  roadWorkActivityFeaturesFiltered: RoadWorkActivityFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenActivityName: string = "";
  chosenActivityYearFrom?: number;
  filterMyActivities?: boolean = false;
  filterFinishOptimumTo?: Date;
  filterDateOfAcceptance?: Date;
  filterEvaluation?: number;
  filterEvaluationSks?: number;
  filterAreaManagerControl: FormControl = new FormControl();
  filterProjectManagerControl: FormControl = new FormControl();

  statusFilterCodes: string[] = ["review", "inconsult", "verified", "reporting", "coordinated", "prestudy"];

  tableDisplayedColumns: string[] = ['status', 'area_man', 'title', 'involved', 'lead', 'project_man',
    'realisation_date', 'due_date', 'link_cityplan', 'link_wwg'];

  user: User = new User();
  userService: UserService;

  private roadWorkActivityService: RoadWorkActivityService;
  private managementAreaService: ManagementAreaService;
  private snckBar: MatSnackBar;

  constructor(roadWorkActivityService: RoadWorkActivityService,
    userService: UserService, managementAreaService: ManagementAreaService,
    snckBar: MatSnackBar) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.managementAreaService = managementAreaService;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.getAllActivities();

    this.userService.getUserFromDB(this.userService.getLocalUser().mailAddress)
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

  getAllActivities() {

    this.roadWorkActivityService.getRoadWorkActivities().subscribe({
      next: (roadWorkActivities) => {

        for (let roadWorkActivity of roadWorkActivities) {
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = roadWorkActivity.geometry.coordinates;
          roadWorkActivity.geometry = blowUpPoly;
          this.managementAreaService.getIntersectingManagementArea(roadWorkActivity.geometry)
            .subscribe({
              next: (managementArea) => {
                if (roadWorkActivity && managementArea) {
                  roadWorkActivity.properties.areaManager = managementArea.manager;
                  roadWorkActivity.properties.evaluation = 0;
                  roadWorkActivity.properties.evaluationSks = 0;
                }
              },
              error: (error) => {
              }
            });
        }

        this.roadWorkActivityFeatures = roadWorkActivities;
        this.filterActivities();
      },
      error: (error) => {
      }
    });

  }

  filterActivities() {

    if (this.statusFilterCodes.includes("all")) {
      let chooseAll = [];
      chooseAll.push('all');
      chooseAll.push('review');
      chooseAll.push('inconsult');
      chooseAll.push('verified');
      chooseAll.push('reporting');
      chooseAll.push('coordinated');
      chooseAll.push('suspended');
      chooseAll.push('prestudy');
      this.statusFilterCodes = chooseAll;
    } else if (this.statusFilterCodes.length == 7) {
      this.statusFilterCodes = [];
    }

    this.roadWorkActivityFeaturesFiltered =
      this.roadWorkActivityFeatures
        .filter(roadWorkActivity => {

          let showActivity = true;

          if (showActivity && roadWorkActivity && roadWorkActivity.properties) {

            if (roadWorkActivity.properties.name) {
              let activityName: string = roadWorkActivity.properties.name.trim().toLowerCase();
              let filterActivityName: string = this.chosenActivityName.trim().toLowerCase();
              if (filterActivityName && activityName) {
                showActivity = activityName.includes(filterActivityName);
              }
            }

            if (showActivity && roadWorkActivity.properties.finishEarlyTo) {
              let finishEarlyTo: Date = new Date(roadWorkActivity.properties.finishEarlyTo);
              if (this.chosenActivityYearFrom) {
                showActivity = finishEarlyTo.getFullYear() === this.chosenActivityYearFrom;
              }
            }

            if (showActivity && roadWorkActivity.properties.status) {
              if (this.statusFilterCodes) {
                showActivity = this.statusFilterCodes.includes(roadWorkActivity.properties.status);
              }
            }

            if (showActivity && this.filterEvaluation && roadWorkActivity.properties.evaluation !== undefined) {
              showActivity = this.filterEvaluation === roadWorkActivity.properties.evaluation;
            }

            if (showActivity && this.filterEvaluationSks && roadWorkActivity.properties.evaluationSks !== undefined) {
              showActivity = this.filterEvaluationSks === roadWorkActivity.properties.evaluationSks;
            }

            if (showActivity && roadWorkActivity.properties.finishOptimumTo && this.filterFinishOptimumTo) {
              let finishOptimumTo: Date = new Date(roadWorkActivity.properties.finishOptimumTo);
              finishOptimumTo.setHours(0, 0, 0, 0);

              let filterFinishOptimumTo: Date = new Date(this.filterFinishOptimumTo);
              filterFinishOptimumTo.setHours(0, 0, 0, 0);

              showActivity = filterFinishOptimumTo.valueOf() === finishOptimumTo.valueOf();
            }

            let filterAreaManager: User | undefined;
            if (showActivity && this.filterAreaManagerControl.value)
              filterAreaManager = this.filterAreaManagerControl.value as User;
            if (filterAreaManager && roadWorkActivity.properties.areaManager) {
              showActivity = filterAreaManager.uuid === roadWorkActivity.properties.areaManager.uuid;
            }

            let filterProjectManager: User | undefined;
            if (showActivity && this.filterProjectManagerControl.value)
              filterProjectManager = this.filterProjectManagerControl.value as User;
            if (filterProjectManager && roadWorkActivity.properties.projectManager) {
              showActivity = filterProjectManager.uuid === roadWorkActivity.properties.projectManager.uuid;
            }

          }

          return showActivity;
        });
  }

  filterUniqueAreaManagers(roadWorkActivityFeatures: RoadWorkActivityFeature[]): User[] {
    let resultUuids: string[] = [];
    let result: User[] = [];
    for (let roadWorkActivityFeature of roadWorkActivityFeatures) {
      if (roadWorkActivityFeature.properties.areaManager &&
        roadWorkActivityFeature.properties.areaManager &&
        !resultUuids.includes(roadWorkActivityFeature.properties.areaManager.uuid)
      ) {
        resultUuids.push(roadWorkActivityFeature.properties.areaManager.uuid);
        result.push(roadWorkActivityFeature.properties.areaManager);
      }
    }
    return result;
  }

  getInvolvedOrgsNames(roadWorkActivity: RoadWorkActivityFeature): string[] {
    let result: string[] = [];
    if (roadWorkActivity) {
      for (let involvedUser of roadWorkActivity.properties.involvedUsers) {
        if (!result.includes(involvedUser.organisationalUnit.abbreviation))
          result.push(involvedUser.organisationalUnit.abbreviation);
      }
    }
    return result;
  }

  getQuarter(date: Date | string): number {
    const d = new Date(date);
    return Math.floor(d.getMonth() / 3) + 1;
  }

  getColorDueDate(roadworkActivity: RoadWorkActivityFeature): string {
    if (roadworkActivity) {
      const today: Date = new Date();
      const dueDate = this.calcDueDate(roadworkActivity);
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

  calcDueDate(roadworkActivity: RoadWorkActivityFeature): Date | undefined {
    let result = undefined;
    if (roadworkActivity.properties.status == "inconsult" ||
      roadworkActivity.properties.status == "verified") {
      if (roadworkActivity.properties.dateConsultEnd)
        result = new Date(roadworkActivity.properties.dateConsultEnd);
    } else if (roadworkActivity.properties.status == "reporting") {
      if (roadworkActivity.properties.dateReportEnd)
        result = new Date(roadworkActivity.properties.dateReportEnd);
    } else if (roadworkActivity.properties.status == "coordinated") {
      if (roadworkActivity.properties.dateInfoEnd)
        result = new Date(roadworkActivity.properties.dateInfoEnd);
    } else {
      result = new Date();
      result.setDate(result.getDate() + 7);
    }
    return result;
  }

  filterUniqueProjectManagers(roadWorkActivityFeatures: RoadWorkActivityFeature[]): User[] {
    let resultUuids: string[] = [];
    let result: User[] = [];
    for (let roadWorkActivityFeature of roadWorkActivityFeatures) {
      if (roadWorkActivityFeature.properties.projectManager &&
        roadWorkActivityFeature.properties.projectManager.uuid &&
        !resultUuids.includes(roadWorkActivityFeature.properties.projectManager.uuid)
      ) {
        resultUuids.push(roadWorkActivityFeature.properties.projectManager.uuid);
        result.push(roadWorkActivityFeature.properties.projectManager);
      }
    }
    return result;
  }

}
