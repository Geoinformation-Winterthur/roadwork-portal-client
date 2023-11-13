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

  displayedColumns: string[] = ['when', 'who', 'what', 'comment'];

  constructor() { }

  ngOnInit(): void {
  }

}
