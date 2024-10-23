import { Component, Input, OnInit } from '@angular/core';
import { ActivityHistoryItem } from 'src/model/activity-history-item';

@Component({
  selector: 'app-activity-history',
  templateUrl: './activity-history.component.html',
  styleUrls: ['./activity-history.component.css']
})
export class ActivityHistoryComponent implements OnInit {

  @Input()
  dataSource: ActivityHistoryItem[] = [];

  displayedColumns: string[] = ['date', 'time', 'person', 'activity', 'comment'];

  constructor() { }

  ngOnInit(): void {
    this.dataSource = this.dataSource;
    let lastChangeDate: Date | undefined;
    for (let activityHistoryItem of this.dataSource) {
      let currChangeDate: Date | undefined;
      if(activityHistoryItem.changeDate) currChangeDate = new Date(activityHistoryItem.changeDate);
      if (lastChangeDate && currChangeDate) {
        if (currChangeDate.getFullYear() == lastChangeDate.getFullYear() &&
          currChangeDate.getMonth() == lastChangeDate.getMonth() &&
          currChangeDate.getDay() == lastChangeDate.getDay()) {
            activityHistoryItem.hideDate = true;
        }
      }
      if(activityHistoryItem.changeDate) lastChangeDate = new Date(activityHistoryItem.changeDate);
    }
  }

}
