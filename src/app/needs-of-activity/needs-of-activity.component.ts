import { Component, Input, OnInit } from '@angular/core';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';

@Component({
  selector: 'app-needs-of-activity',
  templateUrl: './needs-of-activity.component.html',
  styleUrls: ['./needs-of-activity.component.css']
})
export class NeedsOfActivityComponent implements OnInit {

  @Input()
  roadWorkNeedsUuids: string[] = [];

  roadWorkNeeds: RoadWorkNeedFeature[] = [];

  displayedColumns: string[] = ['roadWorkNeedUuid', 'deleteAction'];

  private roadWorkNeedService: RoadWorkNeedService;

  constructor(roadWorkNeedService: RoadWorkNeedService) {
    this.roadWorkNeedService = roadWorkNeedService;
  }

  ngOnInit(): void {

    this.roadWorkNeedService.getRoadWorkNeeds(this.roadWorkNeedsUuids)
    .subscribe({
      next: (roadWorkNeeds) => {
        this.roadWorkNeeds = roadWorkNeeds;
      },
      error: (error) => {
      }
    });
  }

  removeRoadWorkNeed(roadWorkNeedUuid: string){
    alert("Noch nicht realisiert");
    // TODO
  }

}
