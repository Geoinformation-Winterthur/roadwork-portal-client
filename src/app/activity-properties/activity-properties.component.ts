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
  public organisationalUnits: OrganisationalUnit[] = [];
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
    // Add an empty one (new)
    const newActivityResponsibility = new ActivityResponsibilityFeature();
    newActivityResponsibility.properties.uuidRoadworkActivity = this.roadWorkActivityFeature.properties.uuid;
    newActivityResponsibility.properties.responsibilityType = "PhaseLead";
    this.phaseResponsibilityFeatures.push(newActivityResponsibility);

    // load organisational units
    this.organisationalUnits = await firstValueFrom(this.organisationService.getAllOrgTypes(false));

    // load users
    const allUsers = await firstValueFrom(this.userService.getAllUsers())
    this.usersByOrganisationalUnit = allUsers.reduce(
      (result: Record<string, User[]>, user: User) => {
        (result[user.organisationalUnit.uuid] ??= []).push(user);
        return result;
      },
      {} as Record<string, User[]>
    );
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

    // reload elements
    await this.refresh();
  }

  comparePhase = (a: any, b: any) =>
  a?.phase === b?.phase;
}
