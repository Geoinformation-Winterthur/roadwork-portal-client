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

  sliderMin: number = 1980;
  sliderMax: number = new Date().getFullYear();
  sliderStep: number = 1;
  sliderThumbLabel: boolean = true;

  // parent component of this component:
  chooseNeedComponent: ChooseNeedComponent;

  constructor(chooseNeedComponent: ChooseNeedComponent) {
    this.chooseNeedComponent = chooseNeedComponent;
  }

  ngOnInit(): void {
    this.sliderMax = new Date().getFullYear();
    this.sliderMin = new Date().getFullYear();
    this.sliderMin = this.sliderMin - 5;
  }

  filterYears() {
    this.chooseNeedComponent.roadWorkNeedFeaturesFiltered
      = this.chooseNeedComponent.roadWorkNeedFeatures
        .filter(roadWorkNeedFeatures => {
          if(roadWorkNeedFeatures.properties.finishOptimumTo){
            let finishOptimumTo: Date = new Date(roadWorkNeedFeatures.properties.finishOptimumTo);
            return finishOptimumTo.getFullYear() === this.chooseNeedComponent.chosenYear;  
          } else {
            return false;
          }
        });
  }

}
