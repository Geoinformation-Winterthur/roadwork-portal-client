/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ChooseNeedComponent } from '../choose-need/choose-need.component';

@Component({
  selector: 'app-need-name-filter',
  templateUrl: './need-name-filter.component.html',
  styleUrls: ['./need-name-filter.component.css']
})
export class NeedNameFilterComponent implements OnInit {

  needSearchControl: FormControl = new FormControl();

  // parent component of this component:
  chooseNeedComponent: ChooseNeedComponent;

  constructor(chooseNeedComponent: ChooseNeedComponent) {
    this.chooseNeedComponent = chooseNeedComponent;
  }


  ngOnInit(): void {
  }

  filterNeedName() {
    this.chooseNeedComponent.chosenNeedName = this.needSearchControl.value;
    this.chooseNeedComponent.filterNeeds();
  }

}
