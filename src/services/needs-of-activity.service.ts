import { Injectable } from '@angular/core';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';

@Injectable({
  providedIn: 'root'
})
export class NeedsOfActivityService {

  public roadWorkActivityFeature: RoadWorkActivityFeature
          = new RoadWorkActivityFeature();

  public assignedRoadWorkNeeds: RoadWorkNeedFeature[] = [];
  public nonAssignedRoadWorkNeeds: RoadWorkNeedFeature[] = [];
  public registeredRoadWorkNeeds: RoadWorkNeedFeature[] = [];

}
