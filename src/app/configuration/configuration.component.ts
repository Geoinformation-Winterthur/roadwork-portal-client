import { Component, OnInit } from '@angular/core';
import { env } from 'process';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css']
})
export class ConfigurationComponent implements OnInit {

  hrefToOpenApi = environment.apiUrl + "/swagger";

  constructor() { }

  ngOnInit(): void {
  }

}
