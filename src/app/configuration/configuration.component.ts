/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
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

}
