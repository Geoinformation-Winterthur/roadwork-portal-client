/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { OrganisationalUnit } from 'src/model/organisational-unit';
import { UserService } from 'src/services/user.service';
import { User } from '../../model/user';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { OrganisationService } from 'src/services/organisation.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {

  user: User = new User();

  activeCheckBox: boolean = false;

  userOrgFormControl: FormControl = new FormControl();
  availableUserOrgTypes: OrganisationalUnit[] = [];

  private activatedRoute: ActivatedRoute;
  private router: Router;
  private userService: UserService;
  private organisationService: OrganisationService;
  private snckBar: MatSnackBar;

  constructor(activatedRoute: ActivatedRoute, userService: UserService,
    organisationService: OrganisationService, router: Router,
    snckBar: MatSnackBar) {
    this.activatedRoute = activatedRoute;
    this.userService = userService;
    this.organisationService = organisationService;
    this.router = router;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.user = new User();
    this.activatedRoute.params
      .subscribe({
        next: (params) => {
          let userEMail: string = params['email'];
          if (userEMail !== "new") {
            this.userService.getUserFromDB(userEMail).subscribe({
              next: (userArray) => {
                if (userArray !== null && userArray.length === 1) {
                  ErrorMessageEvaluation._evaluateErrorMessage(userArray[0]);
                  if (userArray[0].errorMessage.trim().length === 0) {
                    this.user = userArray[0];
                    this.userOrgFormControl.setValue(this.user.organisationalUnit.name);
                  }
                } else {
                  this.user.errorMessage = "Benutzer existiert nicht.";
                }
              },
              error: (error) => {
              }
            });
          }
        },
        error: (error) => {
        }
      });

    this.organisationService.getAllOrgTypes().subscribe({
      next: (organisations) => {
        for (let organisation of organisations) {
          this.availableUserOrgTypes.push(organisation);
        }
      },
      error: (error) => {
      }
    });

  }

  addUser() {
    this.userService.addUser(this.user).subscribe({
      next: (user) => {
        if (user) {
          if (user.errorMessage != null
            && user.errorMessage.trim().length !== 0) {
            ErrorMessageEvaluation._evaluateErrorMessage(user);
            this.snckBar.open(user.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.user = user;
            this.snckBar.open("Benutzer erfolgreich angelegt", "", {
              duration: 4000
            });
          }
        } else {
          this.snckBar.open("Etwas ist schiefgelaufen", "", {
            duration: 4000
          });
        }
      },
      error: (error) => {
      }
    });
  }

  updateUser() {
    if (this.user && this.user.uuid) {
      this.userService.updateUser(this.user).subscribe({
        next: (errorMessage) => {
          if (errorMessage != null && errorMessage.errorMessage != null
            && errorMessage.errorMessage.trim().length !== 0) {
            ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
            this.snckBar.open(errorMessage.errorMessage, "", {
              duration: 4000
            });
          } else {
            this.snckBar.open("Benutzer erfolgreich aktualisiert", "", {
              duration: 4000
            });
          }
        },
        error: (error) => {
        }
      });
    }
  }

  changePassphrase() {
    this.userService.updateUser(this.user, true).subscribe({
      next: (errorMessage) => {
        if (errorMessage != null && errorMessage.errorMessage != null
          && errorMessage.errorMessage.trim().length !== 0) {
          ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
          this.snckBar.open(errorMessage.errorMessage, "", {
            duration: 4000
          });
        } else {
          this.snckBar.open("Passwort erfolgreich geändert", "", {
            duration: 4000
          });
        }
      },
      error: (error) => {
      }
    })
  }

  deleteUser() {
    this.userService.deleteUser(this.user.mailAddress).subscribe({
      next: (errorMessage) => {
        if (errorMessage != null && errorMessage.errorMessage != null
          && errorMessage.errorMessage.trim().length !== 0) {
          ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
          this.snckBar.open(errorMessage.errorMessage, "", {
            duration: 4000
          });
        } else {
          this.router.navigate(["/users"]);
        }
      },
      error: (error) => {
      }
    })
  }

  onUserOrgChange() {
    for (let orgType of this.availableUserOrgTypes) {
      if (orgType.name === this.userOrgFormControl.value) {
        this.user.organisationalUnit = orgType;
        continue;
      }
    }
    this.updateUser();
  }

}
