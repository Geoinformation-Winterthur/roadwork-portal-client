import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-status-chip',
  templateUrl: './status-chip.component.html',
  styleUrls: ['./status-chip.component.css']
})
export class StatusChipComponent implements OnInit {

  @Input()
  statusCode: string = "";

  @Input()
  short: boolean = false;

  constructor() { }

  ngOnInit(): void {
  }

}
