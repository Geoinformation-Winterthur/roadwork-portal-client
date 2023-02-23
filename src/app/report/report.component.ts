import { Component, OnInit } from '@angular/core';
import { ChartType } from 'chart.js';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css']
})
export class ReportComponent implements OnInit {

  isReportSendSucces: boolean = false;
  isReportSendFailure: boolean = false;

  chart3 = {
    chartData: [
      { data: [48, 55, 67, 72, 85], label: 'Anzahl Bauprojekte monatlich' }
    ],
    chartLabels: ['Nov', 'Dez', 'Jan', 'Feb', 'Mar'],
    chartOptions: {
      responsive: true
    },
    chartColors: [
      {
        backgroundColor: 'rgba(42,127,103,0.2)',
        borderColor: 'rgba(0,75,54,1)'
      }
    ],
    chartLegend: true,
    chartPlugins: []
  }
  chart3ChartType: ChartType = 'bar';


  constructor() {
  }

  ngOnInit(): void {
  }
  
}
