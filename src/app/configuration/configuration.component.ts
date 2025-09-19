/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 *
 * Component for viewing and updating application-wide configuration dates.
 * Values are edited via Angular FormControls and persisted through AppConfigService.
 *
 * Notes: 
 * - `updateCurrentDates()` rebuilds the planned date arrays from the form controls,
 *   converting truthy control values to `Date` instances.
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

  /** Backing model for configuration; populated on init and after successful updates. */
  configurationData: ConfigurationData = new ConfigurationData();

  /** Form controls for SKS planned dates (up to 6 entries). */
  dateSks1Control: FormControl = new FormControl();
  dateSks2Control: FormControl = new FormControl();
  dateSks3Control: FormControl = new FormControl();
  dateSks4Control: FormControl = new FormControl();
  dateSks5Control: FormControl = new FormControl();
  dateSks6Control: FormControl = new FormControl();

  /** Form controls for KAP planned dates (up to 4 entries). */
  dateKap1Control: FormControl = new FormControl();
  dateKap2Control: FormControl = new FormControl();
  dateKap3Control: FormControl = new FormControl();
  dateKap4Control: FormControl = new FormControl();

  /** Form controls for OKS planned dates (up to 11 entries). */
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

  /**
   * Loads the current configuration from the backend.
   * Displays a snackbar if the backend returns a coded/explicit error message.
   */
  ngOnInit(): void {
    this.appConfigService.getConfigurationData()
    .subscribe({
      next: (configData) => {
        if (configData) {
          // Normalize potential coded error messages such as "SSP-<n>".
          ErrorMessageEvaluation._evaluateErrorMessage(configData);
          if (configData.errorMessage !== "") {
            this.snackBar.open(configData.errorMessage, "", {
              duration: 4000
            });
          } else {
            // Bind the fetched configuration to the view model.
            this.configurationData = configData;
          }
        }
      },
      error: (error) => {
        // Intentionally silent; could surface a generic error if desired.
      }
    });
  }

  /**
   * Sends an update with the current form control values.
   * Steps:
   * 1) Rebuild the `plannedDates*` arrays from the form controls.
   * 2) Call the service to persist; show any server message in a snackbar.
   */
  update() {
    if (this.configurationData) {
      this.updateCurrentDates();
      this.appConfigService.updateConfigurationData(this.configurationData)
        .subscribe({
          next: (configData) => {
            // Expand possible code-based error messages before display.
            ErrorMessageEvaluation._evaluateErrorMessage(configData);
            if (configData.errorMessage !== "") {
              this.snackBar.open(configData.errorMessage, "", {
                duration: 4000
              });
            } else {
              // Replace local model with the saved version from the backend.
              this.configurationData = configData;
            }
          },
          error: (error) => {
            // Intentionally silent; consider adding user feedback if needed.
          }
        });
    }
  }

  /**
   * Collects values from the date controls and writes them into
   * `configurationData.plannedDatesSks/Kap/Oks` as arrays of `Date`.
   * Only truthy control values are included.
   */
  private updateCurrentDates(){
    this.configurationData.plannedDatesSks = [];
    if(this.dateSks1Control.value) this.configurationData.plannedDatesSks.push(new Date(this.dateSks1Control.value));
    if(this.dateSks2Control.value) this.configurationData.plannedDatesSks.push(new Date(this.dateSks2Control.value));
    if(this.dateSks3Control.value) this.configurationData.plannedDatesSks.push(new Date(this.dateSks3Control.value));
    if(this.dateSks4Control.value) this.configurationData.plannedDatesSks.push(new Date(this.dateSks4Control.value));
    if(this.dateSks5Control.value) this.configurationData.plannedDatesSks.push(new Date(this.dateSks5Control.value));
    if(this.dateSks6Control.value) this.configurationData.plannedDatesSks.push(new Date(this.dateSks6Control.value));

    this.configurationData.plannedDatesKap = [];
    if(this.dateKap1Control.value) this.configurationData.plannedDatesKap.push(new Date(this.dateKap1Control.value));
    if(this.dateKap2Control.value) this.configurationData.plannedDatesKap.push(new Date(this.dateKap2Control.value));
    if(this.dateKap3Control.value) this.configurationData.plannedDatesKap.push(new Date(this.dateKap3Control.value));
    if(this.dateKap4Control.value) this.configurationData.plannedDatesKap.push(new Date(this.dateKap4Control.value));

    this.configurationData.plannedDatesOks = [];
    if(this.dateOks1Control.value) this.configurationData.plannedDatesOks.push(new Date(this.dateOks1Control.value));
    if(this.dateOks2Control.value) this.configurationData.plannedDatesOks.push(new Date(this.dateOks2Control.value));
    if(this.dateOks3Control.value) this.configurationData.plannedDatesOks.push(new Date(this.dateOks3Control.value));
    if(this.dateOks4Control.value) this.configurationData.plannedDatesOks.push(new Date(this.dateOks4Control.value));
    if(this.dateOks5Control.value) this.configurationData.plannedDatesOks.push(new Date(this.dateOks5Control.value));
    if(this.dateOks6Control.value) this.configurationData.plannedDatesOks.push(new Date(this.dateOks6Control.value));
    if(this.dateOks7Control.value) this.configurationData.plannedDatesOks.push(new Date(this.dateOks7Control.value));
    if(this.dateOks8Control.value) this.configurationData.plannedDatesOks.push(new Date(this.dateOks8Control.value));
    if(this.dateOks9Control.value) this.configurationData.plannedDatesOks.push(new Date(this.dateOks9Control.value));
    if(this.dateOks10Control.value) this.configurationData.plannedDatesOks.push(new Date(this.dateOks10Control.value));
    if(this.dateOks11Control.value) this.configurationData.plannedDatesOks.push(new Date(this.dateOks11Control.value));
  }

}
