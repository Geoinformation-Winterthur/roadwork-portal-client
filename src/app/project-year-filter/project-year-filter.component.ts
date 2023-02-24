import { Component, OnInit } from '@angular/core';
import { ChooseProjectComponent } from '../choose-project/choose-project.component';

@Component({
  selector: 'app-project-year-filter',
  templateUrl: './project-year-filter.component.html',
  styleUrls: ['./project-year-filter.component.css']
})
export class ProjectYearFilterComponent implements OnInit {

  sliderMin: number = 1980;
  sliderMax: number = new Date().getFullYear();
  sliderStep: number = 1;
  sliderThumbLabel: boolean = true;

  // parent component of this component:
  chooseProjectComponent: ChooseProjectComponent;

  constructor(chooseProjectComponent: ChooseProjectComponent) {
    this.chooseProjectComponent = chooseProjectComponent;
  }

  ngOnInit(): void {
    this.sliderMax = new Date().getFullYear();
    this.sliderMin = new Date().getFullYear();
    this.sliderMin = this.sliderMin - 5;
  }

  filterYears() {
    this.chooseProjectComponent.roadWorkProjectFeaturesFiltered
      = this.chooseProjectComponent.roadWorkProjectFeatures
        .filter(roadWorkProjectFeatures => {
          if(roadWorkProjectFeatures.properties.realizationUntil){
            let realizationUntil: Date = new Date(roadWorkProjectFeatures.properties.realizationUntil);
            return realizationUntil.getFullYear() === this.chooseProjectComponent.chosenYear;  
          } else {
            return false;
          }
        });
  }

}
