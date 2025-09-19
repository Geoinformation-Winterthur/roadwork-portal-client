/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 *
 * Component to list events and allow deletion. Normalizes geometry into
 * RoadworkPolygon to align with other modules/services.
 *
 * Notes:
 * - Deletion updates both the master list and the filtered list.
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

  /** All event features fetched from the backend. */
  eventFeatures: EventFeature[] = [];
  /** Filtered subset bound to the UI (currently mirrors eventFeatures). */
  eventFeaturesFiltered: EventFeature[] = [];

  /** Expand/collapse filter UI. */
  filterPanelOpen: boolean = false;

  /** Default year selection (current year). */
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

  /** Lifecycle: load events on component initialization. */
  ngOnInit(): void {
    this.getAllEvents();
  }

  /**
   * Fetches all events and converts geometries to RoadworkPolygon.
   * Also sets the filtered list to the full list by default.
   */
  getAllEvents() {

    this.eventService.getEvents().subscribe({
      next: (events) => {

        for (let event of events) {
          // Access dateTo (side-effect: ensure property exists / triggers getter).
          event.properties.dateTo
          // Normalize geometry into the polygon class used across the app.
          let blowUpPoly: RoadworkPolygon = new RoadworkPolygon();
          blowUpPoly.coordinates = event.geometry.coordinates;
          event.geometry = blowUpPoly;
        }

        this.eventFeatures = events;
        this.eventFeaturesFiltered = this.eventFeatures;

      },
      error: (error) => {
        // Intentionally silent; consider surfacing a snackbar if desired.
      }
    });

  }

  /**
   * Deletes the event by UUID via the service and updates the local lists.
   * Displays an error/warning message from backend in a snackbar if present.
   */
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
            // Remove from both master and filtered arrays to keep UI consistent.
            this.eventFeatures = this.eventFeatures
              .filter((eventFeature) => uuid !== eventFeature.properties.uuid);
            this.eventFeaturesFiltered = this.eventFeaturesFiltered
              .filter((eventFeature) => uuid !== eventFeature.properties.uuid);
          }
        },
        error: (error) => {
          // Swallow errors; optionally show a snackbar in future.
        }
      });
  }

}
