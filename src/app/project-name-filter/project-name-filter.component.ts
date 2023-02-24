import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { RoadWorkProjectService } from '../../services/roadwork_project.service';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { ChooseProjectComponent } from '../choose-project/choose-project.component';

@Component({
  selector: 'app-project-name-filter',
  templateUrl: './project-name-filter.component.html',
  styleUrls: ['./project-name-filter.component.css']
})
export class ProjectNameFilterComponent implements OnInit {

  projectsNames: string[] = [];
  projectsNamesFiltered: Observable<string[]> = new Observable<string[]>();
  projectSearchControl: FormControl = new FormControl();

  private projectService: RoadWorkProjectService;
  // parent component of this component:
  private chooseProjectComponent: ChooseProjectComponent;

  constructor(projectService: RoadWorkProjectService,
    chooseProjectComponent: ChooseProjectComponent) {
    this.projectService = projectService;
    this.chooseProjectComponent = chooseProjectComponent;
  }

  ngOnInit(): void {
    this.projectSearchControl.disable();

    this.projectService.getConstructionProjectsNames().subscribe(
      projectsNamesData => {
        let projectsNamesArray: string[] = projectsNamesData;


        projectsNamesArray.forEach(projectName => {
          this.projectsNames.push(projectName);
        });

        //        this.streets.sort();

        this.projectsNamesFiltered = this.projectSearchControl.valueChanges.pipe(
          startWith(''),
          map(projectName => this._filterProjectName(projectName))
        );

        this.projectSearchControl.enable();

        this.projectSearchControl.valueChanges.subscribe(projectName => {
          if (projectName !== null && projectName !== "") {
            this.chooseProjectComponent.roadWorkProjectFeaturesFiltered
              = this.chooseProjectComponent.roadWorkProjectFeatures
                .filter(roadWorkProjectFeatures => { 
                  return roadWorkProjectFeatures.properties.place === projectName;
                 });
          } else {
            this.chooseProjectComponent.roadWorkProjectFeaturesFiltered
                = this.chooseProjectComponent.roadWorkProjectFeatures;
          }
        });

      });
  }

  private _filterProjectName(projectName: string): string[] {
    const filterVal = projectName.toLowerCase();
    let projectNamesFiltered: string[] =
      this.projectsNames.filter(opt => opt.toLowerCase().indexOf(filterVal) === 0);
    return projectNamesFiltered;
  }

}
