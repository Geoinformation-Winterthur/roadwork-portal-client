import { Component, OnInit } from '@angular/core';
import { RoadWorkProjectService } from 'src/services/roadwork_project.service';
import { RoadWorkProjectFeature } from '../../model/road-work-project-feature';

@Component({
  selector: 'app-choose-project',
  templateUrl: './choose-project.component.html',
  styleUrls: ['./choose-project.component.css']
})
export class ChooseProjectComponent implements OnInit {

  roadWorkProjectFeatures: RoadWorkProjectFeature[] = [];
  roadWorkProjectFeaturesFiltered: RoadWorkProjectFeature[] = [];

  isConstructionProjectServiceOnline: boolean = false;

  filterPanelOpen: boolean = false;

  chosenYear: number = new Date().getFullYear();

  private roadWorkProjectService: RoadWorkProjectService;

  constructor(roadWorkProjectService: RoadWorkProjectService) {
    this.roadWorkProjectService = roadWorkProjectService;
  }

  ngOnInit(): void {
    this.getAllProjects();
  }

  getAllProjects() {

    this.roadWorkProjectService.getConstructionProjectsSummaries().subscribe(
      constructionprojectsData => {
        let constructionprojectsObs: RoadWorkProjectFeature[]
          = constructionprojectsData as RoadWorkProjectFeature[];

        this.roadWorkProjectFeatures = constructionprojectsObs;
        this.roadWorkProjectFeaturesFiltered = this.roadWorkProjectFeatures;

        this.isConstructionProjectServiceOnline = true;

      }, error => {
        this.isConstructionProjectServiceOnline = false;
      });

  }

}
