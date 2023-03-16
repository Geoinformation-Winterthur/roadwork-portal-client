import { Component, OnInit } from '@angular/core';
import { Polygon } from 'ol/geom';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkProjectService } from 'src/services/roadwork-project.service';
import { RoadWorkProjectFeature } from '../../model/road-work-project-feature';

@Component({
  selector: 'app-project-need',
  templateUrl: './choose-project.component.html',
  styleUrls: ['./choose-project.component.css']
})
export class ChooseProjectComponent implements OnInit {

  roadWorkProjectFeatures: RoadWorkProjectFeature[] = [];
  roadWorkProjectFeaturesFiltered: RoadWorkProjectFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenYear: number = new Date().getFullYear();

  private roadWorkProjectService: RoadWorkProjectService;

  constructor(roadWorkProjectService: RoadWorkProjectService) {
    this.roadWorkProjectService = roadWorkProjectService;
  }

  ngOnInit(): void {
    this.getAllNeeds();
  }

  getAllNeeds() {

    this.roadWorkProjectService.getRoadWorkProjects().subscribe({
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
