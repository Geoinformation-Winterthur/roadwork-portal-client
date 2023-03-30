import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Polygon } from 'ol/geom';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
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

  userService: UserService;

  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;
  private router: Router;

  constructor(roadWorkNeedService: RoadWorkNeedService, userService: UserService,
      roadWorkActivityService: RoadWorkActivityService, router: Router) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
    this.userService = userService;
    this.router = router;
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

  createNewActivityFromNeed(roadWorkNeed: RoadWorkNeedFeature){
    this.router.navigate(["/chooseactivity/"]);
    this.roadWorkActivityService.createRoadworkActivityFromNeed(roadWorkNeed)
    .subscribe({
      next: (roadWorkActivityFeature) => {
        // this.router.navigate(["/activity/" + roadWorkActivityFeature.properties.uuid]);
      },
      error: (error) => {
      }
    });
  }

}
