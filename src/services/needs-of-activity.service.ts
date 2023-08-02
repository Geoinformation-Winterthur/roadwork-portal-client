import { Injectable } from '@angular/core';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { RoadWorkNeedService } from './roadwork-need.service';

@Injectable({
  providedIn: 'root'
})
export class NeedsOfActivityService {

  public assignedRoadWorkNeeds: RoadWorkNeedFeature[] = [];
  public nonAssignedRoadWorkNeeds: RoadWorkNeedFeature[] = [];
  public registeredRoadWorkNeeds: RoadWorkNeedFeature[] = [];

  private roadWorkNeedService: RoadWorkNeedService;

  constructor(roadWorkNeedService: RoadWorkNeedService) {
    this.roadWorkNeedService = roadWorkNeedService;
  }

  updateIntersectingRoadWorkNeeds(roadWorkActivityUuid: string,
          allRoadWorkNeedFeatures: RoadWorkNeedFeature[] = []) {
    this.roadWorkNeedService.getIntersectingRoadWorkNeeds(roadWorkActivityUuid)
      .subscribe({
        next: (roadWorkNeeds) => {
          this.nonAssignedRoadWorkNeeds = [];
          for (let roadWorkNeed of roadWorkNeeds) {
            if (!this.assignedRoadWorkNeeds
              .find(assignedRoadWorkNeed => assignedRoadWorkNeed.properties.uuid == roadWorkNeed.properties.uuid) &&
                  !this.registeredRoadWorkNeeds
                    .find(registeredRoadWorkNeed => registeredRoadWorkNeed.properties.uuid == roadWorkNeed.properties.uuid)) {
              this.nonAssignedRoadWorkNeeds.push(roadWorkNeed);
              if(allRoadWorkNeedFeatures.length != 0){
                allRoadWorkNeedFeatures =
                  allRoadWorkNeedFeatures
                    .filter((roadWorkNeed) => this.nonAssignedRoadWorkNeeds.some(nonAssignedNeed => nonAssignedNeed.properties.uuid !== roadWorkNeed.properties.uuid));
              }
            }
          }
        },
        error: (error) => {
        }
      });
  }

}
