import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ChooseActivityComponent } from '../choose-activity/choose-activity.component';

@Component({
  selector: 'app-activity-name-filter',
  templateUrl: './activity-name-filter.component.html',
  styleUrls: ['./activity-name-filter.component.css']
})
export class ActivityNameFilterComponent implements OnInit {

  actvitySearchControl: FormControl = new FormControl();

  // parent component of this component:
  chooseActivityComponent: ChooseActivityComponent;

  constructor(chooseActivityComponent: ChooseActivityComponent) {
    this.chooseActivityComponent = chooseActivityComponent;
  }

  ngOnInit(): void {
  }

  filterActivityName() {
    this.chooseActivityComponent.chosenActivityName = this.actvitySearchControl.value;
    this.chooseActivityComponent.filterActivities();
  }

}
