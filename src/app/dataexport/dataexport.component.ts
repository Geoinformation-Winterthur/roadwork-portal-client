import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { saveAs } from "file-saver";

@Component({
  selector: 'app-dataexport',
  templateUrl: './dataexport.component.html',
  styleUrls: ['./dataexport.component.css']
})
export class DataexportComponent implements OnInit {

  apiUrl = environment.apiUrl;
  hrefToOpenApi = this.apiUrl + "/swagger";

  private roadWorkNeedService: RoadWorkNeedService;

  constructor(roadWorkNeedService: RoadWorkNeedService) {
    this.roadWorkNeedService = roadWorkNeedService;
  }

  ngOnInit(): void {
  }

  startDownload(){
    this.roadWorkNeedService.downloadRoadWorkNeeds().subscribe({
      next: (roadWorkNeedsCsv) => {
        let csvData: Blob = new Blob([roadWorkNeedsCsv],
          {
            type: "text/csv;charset=utf-8"
          });
        saveAs(csvData, "export.csv");
      },
      error: (error) => {
      }
    });
  }

}
