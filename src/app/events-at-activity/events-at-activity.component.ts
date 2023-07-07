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
    this.eventService.getEvents("", false, this.roadWorkActivityUuid).subscribe({
      next: (events) => {
        this.eventsWithSpatioTemporalConflict = events;
      },
      error: (error) => {
      }
    });
  }

}
