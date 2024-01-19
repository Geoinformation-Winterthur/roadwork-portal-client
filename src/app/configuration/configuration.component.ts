/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { ConfigurationData } from 'src/model/configuration-data';
import { AppConfigService } from 'src/services/app-config.service';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css']
})
export class ConfigurationComponent implements OnInit {

  configurationData: ConfigurationData = new ConfigurationData();

  dateSks1Control: FormControl = new FormControl();
  dateSks2Control: FormControl = new FormControl();
  dateSks3Control: FormControl = new FormControl();
  dateSks4Control: FormControl = new FormControl();

  dateKap1Control: FormControl = new FormControl();
  dateKap2Control: FormControl = new FormControl();

  dateOks1Control: FormControl = new FormControl();
  dateOks2Control: FormControl = new FormControl();
  dateOks3Control: FormControl = new FormControl();
  dateOks4Control: FormControl = new FormControl();
  dateOks5Control: FormControl = new FormControl();
  dateOks6Control: FormControl = new FormControl();
  dateOks7Control: FormControl = new FormControl();
  dateOks8Control: FormControl = new FormControl();
  dateOks9Control: FormControl = new FormControl();
  dateOks10Control: FormControl = new FormControl();
  dateOks11Control: FormControl = new FormControl();

  private appConfigService: AppConfigService;
  private snackBar: MatSnackBar;

  constructor(appConfigService: AppConfigService,
      snackBar: MatSnackBar) {
    this.appConfigService = appConfigService;
    this.snackBar = snackBar;
  }

  ngOnInit(): void {
    this.appConfigService.getConfigurationData()
    .subscribe({
      next: (configData) => {
        if (configData) {
          ErrorMessageEvaluation._evaluateErrorMessage(configData);
          if (configData.errorMessage !== "") {
            this.snackBar.open(configData.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.configurationData = configData;
          }
        }
      },
      error: (error) => {
      }
    });
  }

  update() {
    if (this.configurationData) {
      this.updateCurrentDates();
      this.appConfigService.updateConfigurationData(this.configurationData)
        .subscribe({
          next: (configData) => {
            ErrorMessageEvaluation._evaluateErrorMessage(configData);
            if (configData.errorMessage !== "") {
              this.snackBar.open(configData.errorMessage, "", {
                duration: 4000
              });
            } else {
              this.configurationData = configData;
            }
          },
          error: (error) => {
          }
        });
    }
  }

  private updateCurrentDates(){
    this.configurationData.dateSks1 = this.dateSks1Control.value;
    this.configurationData.dateSks2 = this.dateSks2Control.value;
    this.configurationData.dateSks3 = this.dateSks3Control.value;
    this.configurationData.dateSks4 = this.dateSks4Control.value;

    this.configurationData.dateKap1 = this.dateKap1Control.value;
    this.configurationData.dateKap2 = this.dateKap2Control.value;

    this.configurationData.dateOks1 = this.dateOks1Control.value;
    this.configurationData.dateOks2 = this.dateOks2Control.value;
    this.configurationData.dateOks3 = this.dateOks3Control.value;
    this.configurationData.dateOks4 = this.dateOks4Control.value;
    this.configurationData.dateOks5 = this.dateOks5Control.value;
    this.configurationData.dateOks6 = this.dateOks6Control.value;
    this.configurationData.dateOks7 = this.dateOks7Control.value;
    this.configurationData.dateOks8 = this.dateOks8Control.value;
    this.configurationData.dateOks9 = this.dateOks9Control.value;
    this.configurationData.dateOks10 = this.dateOks10Control.value;
    this.configurationData.dateOks11 = this.dateOks11Control.value;
  }

}
