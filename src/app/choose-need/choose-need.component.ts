import { Component, OnInit } from '@angular/core';
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

    let roadWorkNeed = this.roadWorkNeedFeaturesFiltered[0];

    this.roadWorkNeedService.getRoadWorkNeeds().subscribe({
      next: (roadWorkNeedsData) => {
        let roadWorkNeedsObs: RoadWorkNeedFeature[]
          = roadWorkNeedsData as RoadWorkNeedFeature[];

        this.roadWorkNeedFeatures = roadWorkNeedsObs;
        this.roadWorkNeedFeaturesFiltered = this.roadWorkNeedFeatures;

        this.isConstructionProjectServiceOnline = true;
      },
      error: (error) => {
        this.isConstructionProjectServiceOnline = false;
      }
    });

  }

}
