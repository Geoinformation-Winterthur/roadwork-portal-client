import { Component, OnInit } from '@angular/core';
import { Polygon } from 'ol/geom';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';

@Component({
  selector: 'app-choose-need',
  templateUrl: './choose-need.component.html',
  styleUrls: ['./choose-need.component.css']
})
export class ChooseNeedComponent implements OnInit {

  roadWorkNeedFeatures: RoadWorkNeedFeature[] = [];
  roadWorkNeedFeaturesFiltered: RoadWorkNeedFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenYear: number = new Date().getFullYear();

  private roadWorkNeedService: RoadWorkNeedService;

  constructor(roadWorkNeedService: RoadWorkNeedService) {
    this.roadWorkNeedService = roadWorkNeedService;
  }

  ngOnInit(): void {
    this.getAllNeeds();
  }

  getAllNeeds() {

    this.roadWorkNeedService.getRoadWorkNeeds().subscribe({
      next: (roadWorkNeeds) => {

        for(let roadWorkNeed of roadWorkNeeds){
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = roadWorkNeed.geometry.coordinates;
          roadWorkNeed.geometry = blowUpPoly;
        }

        this.roadWorkNeedFeatures = roadWorkNeeds;
        this.roadWorkNeedFeaturesFiltered = this.roadWorkNeedFeatures;

      },
      error: (error) => {
      }
    });

  }

}
