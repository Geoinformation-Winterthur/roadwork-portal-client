/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User } from 'src/model/user';
import { ManagementAreaService } from 'src/services/management-area.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { FormControl } from '@angular/forms';

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
  filterMyNeeds?: boolean = false;
  filterAreaManager?: User;

  user: User = new User();
  userService: UserService;

  areaManagers: User[] = [];

  statusFilterCodes: string[] = ["requirement"];

  tableDisplayedColumns: string[] = ['title', 'areaman', 'create_date', 'link_cityplan', 'link_wwg', 'priority'];

  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;
  private managementAreaService: ManagementAreaService;
  private snckBar: MatSnackBar;
  private router: Router;

  constructor(roadWorkNeedService: RoadWorkNeedService, userService: UserService,
    roadWorkActivityService: RoadWorkActivityService, router: Router,
    managementAreaService: ManagementAreaService, snckBar: MatSnackBar) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
    this.managementAreaService = managementAreaService;
    this.userService = userService;
    this.router = router;
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

    this.roadWorkNeedService
      .getRoadWorkNeeds([], this.filterNeedYearOptFrom,
        roadWorkNeedName, this.filterAreaManager?.uuid,
        this.filterMyNeeds, this.filterRelevance, this.filterDateOfCreation,
        this.statusFilterCodes).subscribe({
          next: (roadWorkNeeds) => {

            for (let roadWorkNeed of roadWorkNeeds) {
              let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
              blowUpPoly.coordinates = roadWorkNeed.geometry.coordinates;
              roadWorkNeed.geometry = blowUpPoly;
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

}
