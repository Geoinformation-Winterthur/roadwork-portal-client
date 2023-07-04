import { Component, OnInit } from '@angular/core';
import { ChooseActivityComponent } from '../choose-activity/choose-activity.component';

@Component({
  selector: 'app-activity-year-filter',
  templateUrl: './activity-year-filter.component.html',
  styleUrls: ['./activity-year-filter.component.css']
})
export class ActivityYearFilterComponent implements OnInit {

  sliderMin: number = new Date().getFullYear() - 10;
  sliderMax: number = new Date().getFullYear() + 30;
  sliderStep: number = 1;
  sliderThumbLabel: boolean = true;

  // parent component of this component:
  chooseActivityComponent: ChooseActivityComponent;

  constructor(chooseActivityComponent: ChooseActivityComponent) {
    this.chooseActivityComponent = chooseActivityComponent;
  }

  ngOnInit(): void {
  }

  filterYears() {
    this.chooseActivityComponent.filterActivities();
  }

}
