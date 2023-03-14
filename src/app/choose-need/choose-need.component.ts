import { Component, OnInit } from '@angular/core';
import { Polygon } from 'ol/geom';
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

  isConstructionProjectServiceOnline: boolean = false;

  filterPanelOpen: boolean = false;

  chosenYear: number = new Date().getFullYear();

  private roadWorkNeedService: RoadWorkNeedService;

  constructor(roadWorkNeedService: RoadWorkNeedService) {
    this.roadWorkNeedService = roadWorkNeedService;
  }

  ngOnInit(): void {
    this.getAllProjects();
  }

  getAllProjects() {

    this.roadWorkNeedService.getRoadWorkNeeds().subscribe({
      next: (roadWorkNeeds) => {

        let roadWorkNeed: any;
        for(roadWorkNeed of roadWorkNeeds){
          let blowUpPoly: Polygon = new Polygon(roadWorkNeed.geometry.coordinates)
          roadWorkNeed.geometry = blowUpPoly;
        }

        this.roadWorkNeedFeatures = roadWorkNeeds;
        this.roadWorkNeedFeaturesFiltered = this.roadWorkNeedFeatures;

        this.isConstructionProjectServiceOnline = true;
      },
      error: (error) => {
        this.isConstructionProjectServiceOnline = false;
      }
    });

  }

}
