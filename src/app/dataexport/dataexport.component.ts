import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-dataexport',
  templateUrl: './dataexport.component.html',
  styleUrls: ['./dataexport.component.css']
})
export class DataexportComponent implements OnInit {

  hrefToOpenApi = environment.apiUrl + "/swagger";

  constructor() { }

  ngOnInit(): void {
  }

}
