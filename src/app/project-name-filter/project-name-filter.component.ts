import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { RoadWorkNeedService } from '../../services/roadwork-need.service';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { ChooseNeedComponent } from '../choose-need/choose-need.component';

@Component({
  selector: 'app-project-name-filter',
  templateUrl: './project-name-filter.component.html',
  styleUrls: ['./project-name-filter.component.css']
})
export class ProjectNameFilterComponent implements OnInit {

  projectsNames: string[] = [];
  projectsNamesFiltered: Observable<string[]> = new Observable<string[]>();
  projectSearchControl: FormControl = new FormControl();

  private needService: RoadWorkNeedService;
  // parent component of this component:
  private chooseNeedComponent: ChooseNeedComponent;

  constructor(needService: RoadWorkNeedService,
    chooseNeedComponent: ChooseNeedComponent) {
    this.needService = needService;
    this.chooseNeedComponent = chooseNeedComponent;
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
