import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { RoadWorkNeedService } from '../../services/roadwork-need.service';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { ChooseNeedComponent } from '../choose-need/choose-need.component';

@Component({
  selector: 'app-need-name-filter',
  templateUrl: './need-name-filter.component.html',
  styleUrls: ['./need-name-filter.component.css']
})
export class NeedNameFilterComponent implements OnInit {

  needsNames: string[] = [];
  needsNamesFiltered: Observable<string[]> = new Observable<string[]>();
  needSearchControl: FormControl = new FormControl();

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

  private _filterNeedName(needName: string): string[] {
    const filterVal = needName.toLowerCase();
    let needNamesFiltered: string[] =
      this.needsNames.filter(opt => opt.toLowerCase().indexOf(filterVal) === 0);
    return needNamesFiltered;
  }

}
