/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EventFeature } from 'src/model/event-feature';
import { EventService } from 'src/services/event.service';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-events',
  templateUrl: './choose-events.component.html',
  styleUrls: ['./choose-events.component.css']
})
export class ChooseEventsComponent implements OnInit {

  eventFeatures: EventFeature[] = [];
  eventFeaturesFiltered: EventFeature[] = [];

  filterPanelOpen: boolean = false;

  chosenYear: number = new Date().getFullYear();

  private eventService: EventService;
  private snckBar: MatSnackBar;
  private router: Router;

  constructor(eventService: EventService, router: Router,
    snckBar: MatSnackBar) {
    this.eventService = eventService;
    this.router = router;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.getAllEvents();
  }

  getAllEvents() {

    this.eventService.getEvents().subscribe({
      next: (events) => {

        for (let event of events) {
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

  delete(uuid: string) {
    this.eventService.deleteEvent(uuid)
      .subscribe({
        next: (errorMessage) => {
          ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
          if (errorMessage && errorMessage.errorMessage &&
                errorMessage.errorMessage.trim().length !== 0) {
            this.snckBar.open(errorMessage.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.eventFeatures = this.eventFeatures
              .filter((eventFeature) => uuid !== eventFeature.properties.uuid);
            this.eventFeaturesFiltered = this.eventFeaturesFiltered
              .filter((eventFeature) => uuid !== eventFeature.properties.uuid);
          }
        },
        error: (error) => {
        }
      });
  }

}
