import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { RoadWorkActivityFeature } from '../../model/road-work-activity-feature';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { DateHelper } from 'src/helper/date-helper';

@Component({
  selector: 'app-activity-dates',
  templateUrl: './activity-dates.component.html',
  styleUrls: ['./activity-dates.component.css']
})
export class ActivityDatesComponent implements OnInit {

  /** The road work activity features from the parent. */
  @Input() roadWorkActivityFeature!: RoadWorkActivityFeature;

  constructor() { }

  ngOnInit(): void {
  }

  normalizeDate(event: MatDatepickerInputEvent<Date>): void {
    return DateHelper.normalizeDate(event);
  }
}
