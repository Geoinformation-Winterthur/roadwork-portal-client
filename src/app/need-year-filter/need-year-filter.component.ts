/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { ChooseNeedComponent } from '../choose-need/choose-need.component';

@Component({
  selector: 'app-need-year-filter',
  templateUrl: './need-year-filter.component.html',
  styleUrls: ['./need-year-filter.component.css']
})
export class NeedYearFilterComponent implements OnInit {

  // parent component of this component:
  chooseNeedComponent: ChooseNeedComponent;

  constructor(chooseNeedComponent: ChooseNeedComponent) {
    this.chooseNeedComponent = chooseNeedComponent;
  }

  ngOnInit(): void {
  }

  filterYears() {
    this.chooseNeedComponent.getNeedsWithFilter();
  }

}
