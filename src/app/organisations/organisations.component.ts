import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { OrganisationalUnit } from 'src/model/organisational-unit';
import { OrganisationService } from 'src/services/organisation.service';

@Component({
  selector: 'app-organisations',
  templateUrl: './organisations.component.html',
  styleUrls: ['./organisations.component.css']
})
export class OrganisationsComponent implements OnInit {

  organisationName: string = "";

  userOrgFormControl: FormControl = new FormControl();
  existingOrganisations: OrganisationalUnit[] = [];

  private organisationService: OrganisationService;
  private snckBar: MatSnackBar;

  constructor(organisationService: OrganisationService,
          snckBar: MatSnackBar) {
    this.organisationService = organisationService;
    this.snckBar = snckBar;
   }

  ngOnInit(): void {
    this._reloadTypes();
  }

  onOrgChange() {
    if(this.userOrgFormControl.value !== 'nouuid'){
      for (let existingOrg of this.existingOrganisations) {
        if (existingOrg.uuid === this.userOrgFormControl.value) {
          this.organisationName = existingOrg.name;
          continue;
        }
      }  
    } else {
      this.organisationName = "";
    }
  }

  addOrganisation() {
    let newOrg: OrganisationalUnit = new OrganisationalUnit();
    newOrg.name = this.organisationName;
    this.organisationService.addOrganisation(newOrg).subscribe({
      next: (org) => {
        if (org !== null) {
          ErrorMessageEvaluation._evaluateErrorMessage(org);
          if(org.errorMessage != null && org.errorMessage.trim().length !== 0){
            ErrorMessageEvaluation._evaluateErrorMessage(org);
            this.snckBar.open(org.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.snckBar.open("Neue Organisation hinzugefügt", "", {
              duration: 4000
            });
          }
        } 
      },
      error: (error) => {
      }
    });
  }

  updateOrganisation() {
    let updateOrg: OrganisationalUnit = new OrganisationalUnit();
    updateOrg.uuid = this.userOrgFormControl.value;
    updateOrg.name = this.organisationName;
    this.organisationService.updateOrganisation(updateOrg).subscribe({
      next: (org) => {
        if (org !== null) {
          ErrorMessageEvaluation._evaluateErrorMessage(org);
          if(org.errorMessage != null && org.errorMessage.trim().length !== 0){
            ErrorMessageEvaluation._evaluateErrorMessage(org);
            this.snckBar.open(org.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.snckBar.open("Organisation aktualisiert", "", {
              duration: 4000
            });
          }
        }
      },
      error: (error) => {
      }
    });
  }

  private _reloadTypes(){
    this.existingOrganisations = [];
    let noOrg: OrganisationalUnit = new OrganisationalUnit();
    noOrg.uuid = "nouuid";
    noOrg.name = "NEU ANLEGEN";
    this.existingOrganisations.push(noOrg);
    this.organisationService.getAllOrgTypes().subscribe({
      next: (organisations) => {
        for (let organisation of organisations) {
          this.existingOrganisations.push(organisation);
        }
      },
      error: (error) => {
      }
    });
  }

}
