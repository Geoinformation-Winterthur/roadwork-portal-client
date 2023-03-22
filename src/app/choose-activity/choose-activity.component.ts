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

  roadWorkProjectFeatures: RoadWorkActivityFeature[] = [];
  roadWorkProjectFeaturesFiltered: RoadWorkActivityFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenYear: number = new Date().getFullYear();

  private roadWorkActivityService: RoadWorkActivityService;

  constructor(roadWorkActivityService: RoadWorkActivityService) {
    this.roadWorkActivityService = roadWorkActivityService;
  }

  ngOnInit(): void {
    this.getAllNeeds();
  }

  getAllNeeds() {

    this.roadWorkActivityService.getRoadWorkProjects().subscribe({
      next: (roadWorkProjects) => {

        for(let roadWorkProject of roadWorkProjects){
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = roadWorkProject.geometry.coordinates;
          roadWorkProject.geometry = blowUpPoly;
        }

        this.roadWorkProjectFeatures = roadWorkProjects;
        this.roadWorkProjectFeaturesFiltered = this.roadWorkProjectFeatures;

      },
      error: (error) => {
      }
    });

  }

}
