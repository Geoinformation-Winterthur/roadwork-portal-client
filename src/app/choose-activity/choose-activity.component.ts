import { Component, OnInit } from '@angular/core';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkActivityFeature } from '../../model/road-work-activity-feature';

@Component({
  selector: 'app-choose-activity',
  templateUrl: './choose-activity.component.html',
  styleUrls: ['./choose-activity.component.css']
})
export class ChooseActivityComponent implements OnInit {

  roadWorkActivityFeatures: RoadWorkActivityFeature[] = [];
  roadWorkActivityFeaturesFiltered: RoadWorkActivityFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenYear: number = new Date().getFullYear();

  private roadWorkActivityService: RoadWorkActivityService;

  constructor(roadWorkActivityService: RoadWorkActivityService) {
    this.roadWorkActivityService = roadWorkActivityService;
  }

  ngOnInit(): void {
    this.getAllActivities();
  }

  getAllActivities() {

    this.roadWorkActivityService.getRoadWorkActivities().subscribe({
      next: (roadWorkActivities) => {

        for(let roadWorkActivity of roadWorkActivities){
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = roadWorkActivity.geometry.coordinates;
          roadWorkActivity.geometry = blowUpPoly;
        }

        this.roadWorkActivityFeatures = roadWorkActivities;
        this.roadWorkActivityFeaturesFiltered = this.roadWorkActivityFeatures;

      },
      error: (error) => {
      }
    });

  }

}
