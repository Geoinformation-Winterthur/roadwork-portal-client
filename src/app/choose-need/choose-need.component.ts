/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User } from 'src/model/user';
import { ManagementAreaService } from 'src/services/management-area.service';

@Component({
  selector: 'app-choose-need',
  templateUrl: './choose-need.component.html',
  styleUrls: ['./choose-need.component.css']
})
export class ChooseNeedComponent implements OnInit {

  roadWorkNeedFeatures: RoadWorkNeedFeature[] = [];

  filterPanelOpen: boolean = false;
  filterNeedName: string = "";
  filterNeedYearOptFrom?: number;
  filterRelevance?: number;
  filterDateOfCreation?: Date;
  filterFinishOptimumTo?: Date;
  filterMyNeeds?: boolean = false;
  filterWithDeleteComment?: boolean = false;
  filterAreaManager?: User;
  filterOrderer?: User;

  user: User = new User();
  userService: UserService;

  areaManagers: User[] = [];
  orderers: User[] = [];

  statusFilterCodes: string[] = ["requirement"];

  tableDisplayedColumns: string[] = ['status', 'areaman', 'title', 'person', 'org', 'description', 'optRealYears', 'create_date', 'last_modified', 'link_cityplan', 'link_wwg'];

  private roadWorkNeedService: RoadWorkNeedService;
  private managementAreaService: ManagementAreaService;
  private snckBar: MatSnackBar;

  constructor(roadWorkNeedService: RoadWorkNeedService, userService: UserService,
    managementAreaService: ManagementAreaService, snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.managementAreaService = managementAreaService;
    this.userService = userService;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.getNeedsWithFilter();

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

  getNeedsWithFilter() {

    let roadWorkNeedName: string = this.filterNeedName.trim().toLowerCase();

    if (this.statusFilterCodes.length == 0) {
      this.roadWorkNeedFeatures = [];
    } else {
      this.roadWorkNeedService
        .getRoadWorkNeeds([], this.filterNeedYearOptFrom, this.filterFinishOptimumTo,
          roadWorkNeedName, this.filterAreaManager?.uuid, this.filterOrderer?.uuid,
          this.filterMyNeeds, this.filterWithDeleteComment, this.filterRelevance,
          this.filterDateOfCreation, this.statusFilterCodes).subscribe({
            next: (roadWorkNeeds) => {

              for (let roadWorkNeed of roadWorkNeeds) {
                let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
                blowUpPoly.coordinates = roadWorkNeed.geometry.coordinates;
                roadWorkNeed.geometry = blowUpPoly;
                this._addOrderer(roadWorkNeed.properties.orderer)
                this.managementAreaService.getIntersectingManagementArea(roadWorkNeed.geometry)
                  .subscribe({
                    next: (managementArea) => {
                      if (roadWorkNeed && managementArea) {
                        roadWorkNeed.properties.managementArea = managementArea;
                        if (managementArea.manager && managementArea.manager.uuid)
                          this._addAreaManager(managementArea.manager);
                      }
                    },
                    error: (error) => {
                    }
                  });
              }

              this.roadWorkNeedFeatures = roadWorkNeeds;
            },
            error: (error) => {
            }
          });
    }

  }

  getQuarter(date: Date | string): number {
    const d = new Date(date);
    return Math.floor(d.getMonth() / 3) + 1;
  }

  private _addAreaManager(areaManager: User) {

    let containsAlready: boolean = false;
    for (let areaManagerThis of this.areaManagers) {
      if (areaManagerThis.uuid === areaManager.uuid) {
        containsAlready = true;
        break;
      }
    }

    if (!containsAlready)
      this.areaManagers.push(areaManager);

  }

  private _addOrderer(orderer: User) {

    let containsAlready: boolean = false;
    for (let ordererThis of this.orderers) {
      if (ordererThis.uuid === orderer.uuid) {
        containsAlready = true;
        break;
      }
    }

    if (!containsAlready)
      this.orderers.push(orderer);

  }

}
