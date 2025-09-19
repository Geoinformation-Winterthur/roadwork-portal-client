/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 *
 * UserComponent
 * -----------------
 * Component for creating, viewing, updating and deleting a single user.
 * 
 * Notes:
 * - Loads the user from the backend and binds it to the view.
 * - Populates the organisation dropdown from `OrganisationService`.
 * - Supports add/update/delete actions and passphrase change, surfacing results via snackbars.
 * - Error strings returned from the backend are normalized via `ErrorMessageEvaluation`
 *   before being shown to the user.
 */
import { HttpErrorResponse } from '@angular/common/http';
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

  /** View model for the currently edited/displayed user. */
  user: User = new User();

  /** Mirrors an "active" checkbox state in the UI (bound in template). */
  activeCheckBox: boolean = false;

  /** Dropdown control for selecting the user's organisational unit by name. */
  userOrgFormControl: FormControl = new FormControl();
  /** Full list of available organisational units (for dropdown options). */
  availableUserOrgTypes: OrganisationalUnit[] = [];

  /** Route services and dependencies injected via constructor. */
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

  /**
   * Initialization:
   * - If route param `email` is not "new", load that user from the backend.
   * - Evaluate/normalize any backend error messages before binding/feedback.
   * - Load all organisations and populate the dropdown options.
   */
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
                  // Convert coded messages (e.g., "SSP-<n>") into readable text if present.
                  ErrorMessageEvaluation._evaluateErrorMessage(userArray[0]);
                  if (userArray[0].errorMessage.trim().length === 0) {
                    this.user = userArray[0];
                    // Preselect the user's organisation in the dropdown by its name.
                    this.userOrgFormControl.setValue(this.user.organisationalUnit.name);
                  }
                } else {
                  // If the backend did not return exactly one user, mark as not found.
                  this.user.errorMessage = "Benutzer existiert nicht.";
                }
              },
              error: (error) => {
                // Intentionally left blank to keep current behavior silent on HTTP error.
              }
            });
          }
        },
        error: (error) => {
          // Intentionally left blank to keep current behavior.
        }
      });

    // Load list of all organisational units for the dropdown.
    this.organisationService.getAllOrgTypes().subscribe({
      next: (organisations) => {
        for (let organisation of organisations) {
          this.availableUserOrgTypes.push(organisation);
        }
      },
      error: (error) => {
        // Intentionally left blank to keep current behavior.
      }
    });

  }

  /**
   * Create a new user using the current form state.
   * - On success, replaces the local `user` with the server response and shows a snackbar.
   * - On backend validation error, normalizes and shows the error text.
   */
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
        // Intentionally left blank to preserve existing behavior.
      }
    });
  }

  /**
   * Update the current user.
   * - Sends the `user` model as-is to the backend.
   * - Shows normalized errors or a success snackbar accordingly.
   */
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
          // Intentionally left blank to preserve existing behavior.
        }
      });
    }
  }

  /**
   * Change the user's passphrase:
   * - Uses the same update endpoint with an additional flag (second param `true`).
   * - Displays normalized error or success feedback.
   */
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
        // Intentionally left blank.
      }
    })
  }

  /**
   * Delete the currently loaded user (by `mailAddress`).
   * - On success, navigates back to the users list.
   * - On error, normalizes and shows the error text.
   */
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
        // Intentionally left blank.
      }
    })
  }

  /**
   * Handler for organisation dropdown changes:
   * - Finds the selected organisation by name and assigns it to `user.organisationalUnit`.
   * - Immediately persists the change via `updateUser()`.
   *
   * Note:
   * - The loop uses `continue` instead of `break`, so it will scan all items even after
   *   a match; this preserves the original implementation exactly.
   */
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
