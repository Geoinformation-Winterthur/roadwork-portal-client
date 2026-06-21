import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NgModel } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { OrganisationService } from '../../services/organisation.service';
import { ActivityResponsibilityService } from '../../services/activity-responsibility.service';
import { RoadWorkActivityFeature } from '../../model/road-work-activity-feature';
import { ActivityResponsibilityFeature } from '../../model/activity-responsibility-feature';
import { OrganisationalUnit } from '../../model/organisational-unit';
import { User } from '../../model/user';
import { UserHelper } from '../../helper/user-helper';

@Component({
  selector: 'app-activity-properties',
  templateUrl: './activity-properties.component.html',
  styleUrls: ['./activity-properties.component.css']
})
export class ActivityPropertiesComponent implements OnInit {

  @ViewChild('projectKindCtrl') projectKindCtrl!: NgModel;

  /** The road work activity features from the parent. */
  @Input() roadWorkActivityFeature!: RoadWorkActivityFeature;

  /** Project kinds from the parent. */
  @Input() projectKindOptions!: { value: string; label: string }[];

  /** Injected services stored for reuse in methods. */
  private activityResponsibilityService: ActivityResponsibilityService;

  public userService: UserService;
  public organisationService: OrganisationService;
  public projectResponsibilityFeature: ActivityResponsibilityFeature = new ActivityResponsibilityFeature();
  public phaseResponsibilityFeatures: ActivityResponsibilityFeature[] = [];
  public deletedPhaseResponsibilityFeatures: ActivityResponsibilityFeature[] = [];
  public allOrganisationalUnits: OrganisationalUnit[] = [];
  public organisationalUnits: OrganisationalUnit[] = [];
  public allUsers: User[] = [];
  public usersByOrganisationalUnit: Record<string, User[]> = {};

  constructor(userService: UserService, organisationService: OrganisationService, activityResponsibilityService: ActivityResponsibilityService) {
    this.userService = userService;
    this.organisationService = organisationService;
    this.activityResponsibilityService = activityResponsibilityService
  }

  ngOnInit() {
    this.refresh();
  }

  validateProjectKind(): boolean {
    if (this.projectKindCtrl) {
      this.projectKindCtrl.control.markAsTouched();
      this.projectKindCtrl.control.updateValueAndValidity();
    }

    if (this.projectKindCtrl.invalid) {
      return false;
    }

    return true;
  }

  async refresh() {
    // load project project responsibility feature
    this.projectResponsibilityFeature = await this.activityResponsibilityService.getProjectActivityResponsibility(this.roadWorkActivityFeature.properties.uuid);

    // load phase project responsibility features
    this.phaseResponsibilityFeatures = await this.activityResponsibilityService.getPhaseActivityResponsibilities(this.roadWorkActivityFeature.properties.uuid);
    
    // load organisational units
    this.allOrganisationalUnits = await firstValueFrom(this.organisationService.getAllOrgTypes(false));

    // load users
    this.allUsers = await firstValueFrom(this.userService.getAllUsers())

    await this.refreshProjectUsers();
  }

  async refreshProjectUsers() {
    // get the relevant users by organisatinal unit (key: orgUnit, value: user[])
    // filters:
    // - user is project manager
    // - user is active
    // - is (not) member of tba depending on selected value in "Umsetzung durch Dritte"
    const tbaSelected = !this.roadWorkActivityFeature.properties.implementationByThird;
    this.usersByOrganisationalUnit = this.allUsers.reduce(
      (result: Record<string, User[]>, user: User) => {
        if (user.grantedRoles.projectmanager && user.active && UserHelper.isTbaUser(user) === tbaSelected) {
          (result[user.organisationalUnit.uuid] ??= []).push(user);
        }
        return result;
      },
      {} as Record<string, User[]>
    );

    // add already assigned user (project), might be filtered by now
    this.addUserIfNotExists(this.projectResponsibilityFeature.properties.uuidUser)

    // add already assigned user (phases), might be filtered by now
    for (const phaseResponsibility of this.phaseResponsibilityFeatures) {
      this.addUserIfNotExists(phaseResponsibility.properties.uuidUser)
    }

    // get the org units with relevan users
    this.organisationalUnits = this.allOrganisationalUnits.filter(
      obj => Object.keys(this.usersByOrganisationalUnit).includes(obj.uuid)
    );
  }

  /**
  * Adds a user to this.usersByOrganisationalUnit if not containing yet.
  *
  * @param user The user to add.
  */
  addUserIfNotExists(userUuid: string) {
    const user = this.allUsers.find(user => user.uuid === userUuid);
    if (!user) return;

    const orgUnitUuid = user.organisationalUnit.uuid;

    if (!this.usersByOrganisationalUnit[orgUnitUuid]) {
      // add both if org unit missing
      this.usersByOrganisationalUnit[orgUnitUuid] = [];
      this.usersByOrganisationalUnit[orgUnitUuid].push(user);
    }
    else {
      // add user if missing 
      const userExists = this.usersByOrganisationalUnit[orgUnitUuid].some(
        elem => elem.uuid === user.uuid);

      if (!userExists) {
        this.usersByOrganisationalUnit[orgUnitUuid].push(user);
      }
    }
  }

  async save() {
    // add/update project responsibility feature
    if (this.projectResponsibilityFeature.properties.isChanged()) {
      if (this.projectResponsibilityFeature.properties.uuid == "") {
        this.projectResponsibilityFeature.properties.uuidRoadworkActivity = this.roadWorkActivityFeature.properties.uuid;
        await this.activityResponsibilityService.addActivityResponsibility(this.projectResponsibilityFeature);
      }
      else {
        await this.activityResponsibilityService.updateActivityResponsibility(this.projectResponsibilityFeature);
      }
    }

    // add/update phase responsibility entries
    for (const phaseResponsibilityFeature of this.phaseResponsibilityFeatures) {
      if (phaseResponsibilityFeature.properties.isChanged()) {
        if (phaseResponsibilityFeature.properties.uuid == "") {
          await this.activityResponsibilityService.addActivityResponsibility(phaseResponsibilityFeature);
        }
        else {
          await this.activityResponsibilityService.updateActivityResponsibility(phaseResponsibilityFeature);
        }
      }
    }

    // delete phase responsibility entries
    for (const deletedPhaseResponsibilityFeature of this.deletedPhaseResponsibilityFeatures) {
      if (deletedPhaseResponsibilityFeature.properties.uuid) {
          await this.activityResponsibilityService.deleteActivityResponsibility(deletedPhaseResponsibilityFeature.properties.uuid);
      }
    }

    // reload elements
    await this.refresh();
  }

  onOeChange(responsibilityFeature: ActivityResponsibilityFeature) {
    responsibilityFeature.properties.uuidUser = '';
  }

  onRemovePhaseResponsibilityClick(phaseResponsibilityFeature: ActivityResponsibilityFeature) {
    this.phaseResponsibilityFeatures = this.phaseResponsibilityFeatures.filter(elem => elem !== phaseResponsibilityFeature);

    if (phaseResponsibilityFeature.properties.uuid) {
      this.deletedPhaseResponsibilityFeatures.push(phaseResponsibilityFeature);
    }
  }

  addResponsibilityClick() {
    // Add an empty one (new)
    const newActivityResponsibility = new ActivityResponsibilityFeature();
    newActivityResponsibility.properties.uuidRoadworkActivity = this.roadWorkActivityFeature.properties.uuid;
    newActivityResponsibility.properties.responsibilityType = "PhaseLead";
    this.phaseResponsibilityFeatures.push(newActivityResponsibility);
  }

  comparePhase = (a: any, b: any) =>
    a?.phase === b?.phase;
}
