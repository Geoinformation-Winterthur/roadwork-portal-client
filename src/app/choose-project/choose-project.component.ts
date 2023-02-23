/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Vermessungsamt Winterthur. All rights reserved.
 */
 import { Component, OnInit } from '@angular/core';
 import { RoadWorkProjectService } from 'src/services/roadwork_project.service';
 
 @Component({
   selector: 'app-choose-device',
   templateUrl: './choose-project.component.html',
   styleUrls: ['./choose-project.component.css']
 })
 export class ChooseProjectComponent implements OnInit {
 
  streetWorkProjectService: RoadWorkProjectService;
 
   constructor(streetWorkProjectService: RoadWorkProjectService) {
     this.streetWorkProjectService = streetWorkProjectService;
    }
 
   ngOnInit(): void {
   }
 
 }
 