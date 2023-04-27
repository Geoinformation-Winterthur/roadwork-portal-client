import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EventFeature } from 'src/model/event-feature';
import { EventService } from 'src/services/event.service';
import { RoadworkPolygon } from 'src/model/road-work-polygon';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css']
})
export class EventsComponent implements OnInit {

  eventFeatures: EventFeature[] = [];
  eventFeaturesFiltered: EventFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenYear: number = new Date().getFullYear();

  private eventService: EventService;
  private router: Router;

  constructor(eventService: EventService, router: Router) {
    this.eventService = eventService;
    this.router = router;
  }

  ngOnInit(): void {
    this.getAllEvents();
  }

  getAllEvents() {

    this.eventService.getEvents().subscribe({
      next: (events) => {

        for(let event of events){
          event.properties.dateTo
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = event.geometry.coordinates;
          event.geometry = blowUpPoly;
        }

        this.eventFeatures = events;
        this.eventFeaturesFiltered = this.eventFeatures;

      },
      error: (error) => {
      }
    });

  }

}
