/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 *
 * ReportComponent
 * ---------------
 * Displays three statistical bar charts using values provided by `StatisticsService`:
 * 1) Monthly count of newly created roadwork activities.
 * 2) Monthly count of newly created needs.
 * 3) Count of activities per area manager (with randomly generated bar colors).
 *
 * Notes:
 * - Chart configuration objects are updated in-place once data is fetched.
 */
import { Component, OnInit } from '@angular/core';
import { ChartType } from 'chart.js';
import { StatisticsService } from 'src/services/statistics.service';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css']
})
export class ReportComponent implements OnInit {

  /** Flags for showing a "report sent" state (currently unused in this file). */
  isReportSendSucces: boolean = false;
  isReportSendFailure: boolean = false;

  /**
   * Chart model: new activities per month.
   * - `chartData[0].data` will be replaced by values from the service.
   * - `chartLabels` will be filled with month labels from the service.
   */
  newActivitiesLastMonthChart = {
    chartData: [
      { data: [0], label: 'Anzahl neuer Bauvorhaben monatlich' }
    ],
    chartLabels: [''],
    chartOptions: {
      responsive: true,
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true,
            stepSize: 1
          }
        }]
      }
    },
    chartColors: [
    ],
    chartLegend: true,
    chartPlugins: []
  }
  /** Visualization type for the activities chart. */
  newActivitiesLastMonthChartType: ChartType = 'bar';

  /**
   * Chart model: new needs per month.
   * - Populated analogously to `newActivitiesLastMonthChart`.
   */
  newNeedsLastMonthChart = {
    chartData: [
      { data: [0], label: 'Anzahl neuer Bedarfe monatlich' }
    ],
    chartLabels: [''],
    chartOptions: {
      responsive: true,
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true,
            stepSize: 1
          }
        }]
      }
    },
    chartColors: [
    ],
    chartLegend: true,
    chartPlugins: []
  }
  /** Visualization type for the needs chart. */
  newNeedsLastMonthChartType: ChartType = 'bar';

  /**
   * Chart model: number of activities per area manager.
   * - Background colors are generated randomly for each bar.
   */
  activitiesOfAreaManagerChart = {
    chartData: [
      {
        data: [0],
        label: 'Anzahl Bauvorhaben pro Gebietsmanagement',
        backgroundColor: ['']
      }
    ],
    chartLabels: [''],
    chartOptions: {
      responsive: true
    },
    chartLegend: true,
    chartPlugins: []
  }

  /** Service used to fetch statistical datasets. */
  private statisticsService: StatisticsService;

  constructor(statisticsService: StatisticsService) {
    this.statisticsService = statisticsService;
  }

  /**
   * On init, load all three datasets in parallel (separate subscriptions)
   * and write the received labels/values into the corresponding chart models.
   */
  ngOnInit(): void {

    // Load monthly new activities and fill the activities chart.
    this.statisticsService.getStatistics("new_activities_last_month")
      .subscribe({
        next: (chartEntries) => {
          let chartLabels: string[] = [];
          let chartValues: number[] = [];
          for (let chartEntry of chartEntries) {
            if (chartEntry.value) {
              chartLabels.push(chartEntry.label);
              chartValues.push(chartEntry.value);
            }
          }

          this.newActivitiesLastMonthChart.chartLabels = chartLabels;
          this.newActivitiesLastMonthChart.chartData[0].data = chartValues;
        },
        error: (error) => {
          // Intentionally left empty to preserve current behavior (no UI error surfacing here).
        }
      });

    // Load monthly new needs and fill the needs chart.
    this.statisticsService.getStatistics("new_needs_last_month")
      .subscribe({
        next: (chartEntries) => {
          let chartLabels: string[] = [];
          let chartValues: number[] = [];
          for (let chartEntry of chartEntries) {
            if (chartEntry.value) {
              chartLabels.push(chartEntry.label);
              chartValues.push(chartEntry.value);
            }
          }

          this.newNeedsLastMonthChart.chartLabels = chartLabels;
          this.newNeedsLastMonthChart.chartData[0].data = chartValues;
        },
        error: (error) => {
          // Intentionally left empty to preserve current behavior.
        }
      });

    // Load counts per area manager and fill the corresponding chart.
    this.statisticsService.getStatistics("activities_of_area_man")
      .subscribe({
        next: (chartEntries) => {
          let chartLabels: string[] = [];
          let chartValues: number[] = [];
          let chartColorsTemp = [];
          this.activitiesOfAreaManagerChart.chartData[0].backgroundColor = [];
          for (let chartEntry of chartEntries) {
            if (chartEntry.value) {
              // Generate a random RGB triplet and derive RGBA strings for fill/border.
              let randomRgb: string = Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255);
              let randBackgroundColor: string = "rgba(" + randomRgb + ",0.2)";
              let randBorderColor: string = "rgba(" + randomRgb + ",1.0)";
              chartLabels.push(chartEntry.label);
              chartValues.push(chartEntry.value);
              chartColorsTemp.push(randBackgroundColor);
            }
          }

          this.activitiesOfAreaManagerChart.chartLabels = chartLabels;
          this.activitiesOfAreaManagerChart.chartData[0].data = chartValues;
          this.activitiesOfAreaManagerChart.chartData[0].backgroundColor = chartColorsTemp;

        },
        error: (error) => {
          // Intentionally left empty to preserve current behavior.
        }
      });

  }

}
