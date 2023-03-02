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
  }

  private _filterProjectName(projectName: string): string[] {
    const filterVal = projectName.toLowerCase();
    let projectNamesFiltered: string[] =
      this.projectsNames.filter(opt => opt.toLowerCase().indexOf(filterVal) === 0);
    return projectNamesFiltered;
  }

}
