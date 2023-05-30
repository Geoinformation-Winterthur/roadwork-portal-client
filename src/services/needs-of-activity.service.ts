import { Injectable } from '@angular/core';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';

@Injectable({
  providedIn: 'root'
})
export class NeedsOfActivityService {

  public roadWorkNeeds: RoadWorkNeedFeature[] = [];

  constructor() { }
}
