import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { saveAs } from "file-saver";
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';

@Component({
  selector: 'app-dataexport',
  templateUrl: './dataexport.component.html',
  styleUrls: ['./dataexport.component.css']
})
export class DataexportComponent implements OnInit {

  apiUrl = environment.apiUrl;
  hrefToOpenApi = this.apiUrl + "/swagger";

  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;

  constructor(roadWorkNeedService: RoadWorkNeedService,
        roadWorkActivityService: RoadWorkActivityService) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
  }

  ngOnInit(): void {
  }

  startDownload(type: string){
    let today: Date = new Date();
    if(type === "needs"){
      this.roadWorkNeedService.downloadRoadWorkNeeds(type).subscribe({
        next: (roadWorkNeedsCsv) => {
          let csvData: Blob = new Blob([roadWorkNeedsCsv],
            {
              type: "text/csv;charset=utf-8"
            });
          saveAs(csvData, "Baubedarfe_Export" + 
                  today.getFullYear() + "" + (today.getMonth() + 1) + "" + today.getDate() +
                  ".csv");
        },
        error: (error) => {
        }
      });
    } else if(type === "activities"){
      this.roadWorkNeedService.downloadRoadWorkNeeds(type).subscribe({
        next: (roadWorkNeedsCsv) => {
          let csvData: Blob = new Blob([roadWorkNeedsCsv],
            {
              type: "text/csv;charset=utf-8"
            });
          saveAs(csvData, "Bauvorhaben_Export" +
            today.getFullYear() + "" + (today.getMonth() + 1) + "" + today.getDate() +
            ".csv");
        },
        error: (error) => {
        }
      });
    }
  }

}
