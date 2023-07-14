import { Component, Input, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventFeature } from 'src/model/event-feature';
import { EventService } from 'src/services/event.service';

@Component({
  selector: 'app-events-at-activity',
  templateUrl: './events-at-activity.component.html',
  styleUrls: ['./events-at-activity.component.css']
})
export class EventsAtActivityComponent implements OnInit {

  @Input()
  roadWorkActivityUuid?: string;

  displayedColumns: string[] = ['name', 'startDate', 'endDate', 'lastModified'];

  eventsWithSpatioTemporalConflict: EventFeature[] = [];
  eventsWithSpatialConflict: EventFeature[] = [];
  eventsWithTemporalConflict: EventFeature[] = [];

  private eventService: EventService;
  private snckBar: MatSnackBar;

  constructor(eventService: EventService, snckBar: MatSnackBar) {
    this.eventService = eventService;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    if (this.roadWorkActivityUuid) {
      this.eventService
        .getEvents("", this.roadWorkActivityUuid, true, true, false)
        .subscribe({
          next: (events) => {
            this.eventsWithSpatioTemporalConflict = events;
          },
          error: (error) => {
          }
        });
      this.eventService
        .getEvents("", this.roadWorkActivityUuid, true, false, false)
        .subscribe({
          next: (events) => {
            this.eventsWithTemporalConflict = events;
          },
          error: (error) => {
          }
        });
      this.eventService
        .getEvents("", this.roadWorkActivityUuid, false, true, false)
        .subscribe({
          next: (events) => {
            this.eventsWithSpatialConflict = events;
          },
          error: (error) => {
          }
        });
    }
  }

}
