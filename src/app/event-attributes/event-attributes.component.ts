/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserService } from 'src/services/user.service';
import { User } from 'src/model/user';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { EventFeature } from 'src/model/event-feature';
import { EventService } from 'src/services/event.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-event-attributes',
  templateUrl: './event-attributes.component.html',
  styleUrls: ['./event-attributes.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class EventAttributesComponent implements OnInit {

  eventFeature?: EventFeature;
  editor: User = new User();
  editorOrgUnitName: string = "";

  dateFromControl: FormControl = new FormControl();
  dateToControl: FormControl = new FormControl();

  userService: UserService;

  private eventService: EventService;
  private activatedRoute: ActivatedRoute;
  private activatedRouteSubscription: Subscription = new Subscription();

  private snckBar: MatSnackBar;

  constructor(activatedRoute: ActivatedRoute, eventService: EventService,
    userService: UserService, snckBar: MatSnackBar) {
    this.activatedRoute = activatedRoute;
    this.eventService = eventService;
    this.userService = userService;
    this.snckBar = snckBar;
  }

  ngOnInit() {
    this.activatedRouteSubscription = this.activatedRoute.params
      .subscribe(params => {
        let idParamString: string = params['id'];

        if (idParamString == "new") {

          this.eventFeature = EventAttributesComponent.
            _createNewEventFeature();

        } else {

          let constEventId: string = params['id'];

          this.eventService.getEvents(constEventId)
            .subscribe({
              next: (events) => {
                if (events.length === 1) {
                  let event: any = events[0];
                  let rwPoly: RoadworkPolygon = new RoadworkPolygon();
                  rwPoly.coordinates = event.geometry.coordinates
                  event.geometry = rwPoly;
                  this.eventFeature = event;
                  let eventFeature: EventFeature = this.eventFeature as EventFeature;
                }
              },
              error: (error) => {
              }
            });

        }

      });

  }

  add() {
    this.eventService.addEvent(this.eventFeature)
      .subscribe({
        next: (eventFeature) => {
          if (this.eventFeature) {
            ErrorMessageEvaluation._evaluateErrorMessage(eventFeature);
            if (eventFeature.errorMessage.trim().length !== 0) {
              this.snckBar.open(eventFeature.errorMessage, "", {
                duration: 4000
              });
            }
            this.eventFeature.properties.uuid = eventFeature.properties.uuid;
            this.eventFeature.properties.name = eventFeature.properties.name;
            this.eventFeature.properties.created = eventFeature.properties.created;
            this.eventFeature.properties.lastModified = eventFeature.properties.lastModified;
            this.eventFeature.properties.dateFrom = eventFeature.properties.dateFrom;
            this.eventFeature.properties.dateTo = eventFeature.properties.dateTo;
          }
        },
        error: (error) => {
        }
      });
  }

  update() {
    if (this.eventFeature && this.eventFeature.properties.uuid) {
      this.eventFeature.properties.dateFrom = this.dateFromControl.value;
      this.eventFeature.properties.dateTo = this.dateToControl.value;
      this.eventService.updateEvent(this.eventFeature)
        .subscribe({
          next: (eventFeature) => {
            if (this.eventFeature) {
              ErrorMessageEvaluation._evaluateErrorMessage(eventFeature);
              if (eventFeature.errorMessage.trim().length !== 0) {
                this.snckBar.open(eventFeature.errorMessage, "", {
                  duration: 4000
                });
              }
            }
          },
          error: (error) => {
          }
        });
    }
  }

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
  }

  private static _createNewEventFeature(): EventFeature {

    let eventFeature: EventFeature = new EventFeature();
    eventFeature.properties.name = "";
    eventFeature.properties.created = new Date();
    eventFeature.properties.lastModified = new Date();
    eventFeature.properties.dateFrom = new Date();
    eventFeature.properties.dateTo = new Date();
    eventFeature.properties.isEditingAllowed = true;

    return eventFeature;
  }

}
