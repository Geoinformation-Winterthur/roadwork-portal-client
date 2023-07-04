/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { RoadWorkNeedService } from '../../services/roadwork-need.service';
import { Observable } from 'rxjs';
import { ChooseNeedComponent } from '../choose-need/choose-need.component';

@Component({
  selector: 'app-need-name-filter',
  templateUrl: './need-name-filter.component.html',
  styleUrls: ['./need-name-filter.component.css']
})
export class NeedNameFilterComponent implements OnInit {

  needsNames: Observable<string[]> = new Observable<string[]>();
  needsNamesFiltered: Observable<string[]> = new Observable<string[]>();
  needSearchControl: FormControl = new FormControl();

  private needService: RoadWorkNeedService;
  // parent component of this component:
  chooseNeedComponent: ChooseNeedComponent;

  constructor(needService: RoadWorkNeedService,
    chooseNeedComponent: ChooseNeedComponent) {
    this.needService = needService;
    this.chooseNeedComponent = chooseNeedComponent;
  }


  ngOnInit(): void {
  }

  filterNeedName() {
    this.chooseNeedComponent.chosenNeedName = this.needSearchControl.value;
    this.chooseNeedComponent.filterNeeds();
  }

}
