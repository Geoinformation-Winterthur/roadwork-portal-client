import { Component, OnInit } from '@angular/core';
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

  chosenOrganisation: OrganisationalUnit;
  existingOrganisations: OrganisationalUnit[] = [];

  private organisationService: OrganisationService;
  private snckBar: MatSnackBar;

  constructor(organisationService: OrganisationService,
          snckBar: MatSnackBar) {
    this.chosenOrganisation = new OrganisationalUnit();
    this.chosenOrganisation.isNew = true;
    this.organisationService = organisationService;
    this.snckBar = snckBar;
   }

  ngOnInit(): void {
    this._reloadTypes();
  }

  addOrganisation() {
    this.organisationService.addOrganisation(this.chosenOrganisation).subscribe({
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
    this.organisationService.updateOrganisation(this.chosenOrganisation).subscribe({
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
    noOrg.name = "";
    noOrg.isNew = true;
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
