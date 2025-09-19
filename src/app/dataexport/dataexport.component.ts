/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 *
 * DataexportComponent
 * -------------------
 * Component to trigger data exports, currently supporting CSV export of road work needs.
 *  
 * Notes:
 * - Uses FileSaver to handle file download.
 * - Prepends a UTF-8 BOM to the CSV to ensure correct encoding in Excel.
 * - Filename includes the current date for easy identification.
 * 
 */
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

  /**
   * Base API URL taken from environment configuration.
   * Used below to expose a direct link to the OpenAPI (Swagger) UI.
   */
  apiUrl = environment.apiUrl;

  /**
   * Convenience link to the API's Swagger/OpenAPI endpoint.
   * Example: https://<host>/.../swagger
   */
  hrefToOpenApi = this.apiUrl + "/swagger";

  /** Service providing CSV export for road work needs. */
  private roadWorkNeedService: RoadWorkNeedService;

  /** Activity service available for future exports (currently unused here). */
  private roadWorkActivityService: RoadWorkActivityService;

  /**
   * Dependency injection of export-related services.
   */
  constructor(roadWorkNeedService: RoadWorkNeedService,
    roadWorkActivityService: RoadWorkActivityService) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
  }

  /** Lifecycle hook; no initialization required at the moment. */
  ngOnInit(): void {
  }

  /**
   * Triggers a CSV download of road work needs.
   * Steps:
   * 1) Calls the service to retrieve CSV text.
   * 2) Prepends a UTF-8 BOM so Excel correctly recognizes encoding (umlauts, ß, etc.).
   * 3) Wraps the text in a Blob with text/csv MIME type.
   * 4) Generates a filename using the current date (no zero-padding).
   * 5) Saves the file via FileSaver's `saveAs`.
   */
  startDownload() {
    let today: Date = new Date();
    this.roadWorkNeedService.downloadRoadWorkNeeds().subscribe({
      next: (roadWorkNeedsCsv: string) => {
        // Add UTF-8 BOM for better compatibility with spreadsheet apps (e.g., Excel).
        const utf8BOM  = '\uFEFF';

        // Create a CSV blob; charset specified to help consumers parse correctly.
        let csvData: Blob = new Blob([utf8BOM + roadWorkNeedsCsv],
        {
            type: "text/csv;charset=utf-8"
        });

        // Filename pattern includes year, month (1-based), and day; no leading zeros.
        // Example: Bauvorhaben_Export2025319.csv for 2025-03-19.
        const filename = `Bauvorhaben_Export${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}.csv`;

        // Trigger download.
        saveAs(csvData, filename);
      },
      error: (error) => {
        // Silent failure; consider surfacing a snackbar if user feedback is desired.
      }
    });

  }

}
