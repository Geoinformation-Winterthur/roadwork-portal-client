/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
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

  isReportSendSucces: boolean = false;
  isReportSendFailure: boolean = false;

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
  newActivitiesLastMonthChartType: ChartType = 'bar';

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
  newNeedsLastMonthChartType: ChartType = 'bar';

  activitiesOfAreaManagerChart = {
    chartData: [
      { data: [0], label: 'Anzahl Bauvorhaben pro Gebietsmanagement' }
    ],
    chartLabels: [''],
    chartOptions: {
      responsive: true
    },
    chartColors: [{
      backgroundColor: '',
      borderColor: ''
    }],
    chartLegend: true,
    chartPlugins: []
  }

  private statisticsService: StatisticsService;

  constructor(statisticsService: StatisticsService) {
    this.statisticsService = statisticsService;
  }

  ngOnInit(): void {

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
        }
      });

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
        }
      });

    this.statisticsService.getStatistics("activities_of_area_man")
      .subscribe({
        next: (chartEntries) => {
          let chartLabels: string[] = [];
          let chartValues: number[] = [];
          let chartColorsTemp = [];
          this.activitiesOfAreaManagerChart.chartColors = [];
          for (let chartEntry of chartEntries) {
            if (chartEntry.value) {
              let randomRgb: string = Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255);
              let randBackgroundColor: string = "rgba(" + randomRgb + ",0.2)";
              let randBorderColor: string = "rgba(" + randomRgb + ",1.0)";
              chartLabels.push(chartEntry.label);
              chartValues.push(chartEntry.value);
              chartColorsTemp.push({ backgroundColor: randBackgroundColor, borderColor: randBorderColor})
            }
          }

          this.activitiesOfAreaManagerChart.chartLabels = chartLabels;
          this.activitiesOfAreaManagerChart.chartData[0].data = chartValues;
          this.activitiesOfAreaManagerChart.chartColors = chartColorsTemp;
          
        },
        error: (error) => {
        }
      });

  }

}
