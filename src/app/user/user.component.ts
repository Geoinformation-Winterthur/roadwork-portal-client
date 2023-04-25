import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { OrganisationalUnit } from 'src/model/organisational-unit';
import { Role } from 'src/model/role';
import { UserService } from 'src/services/user.service';
import { User } from '../../model/user';
import { ErrorMessage } from 'src/model/error-message';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {

  user: User = new User();
  userExists: boolean = false;

  activeCheckBox: boolean = false;

  userRoleFormControl: FormControl = new FormControl();
  availableUserRoleTypes: Role[] = [];

  userOrgFormControl: FormControl = new FormControl();
  availableUserOrgTypes: OrganisationalUnit[] = [];

  private activatedRoute: ActivatedRoute;
  private router: Router;
  private userService: UserService;
  private snckBar: MatSnackBar;

  constructor(activatedRoute: ActivatedRoute, userService: UserService,
    router: Router, snckBar: MatSnackBar) {
    this.activatedRoute = activatedRoute;
    this.userService = userService;
    this.router = router;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
    this.user = new User();
    this.userExists = false;
    this.activatedRoute.params
      .subscribe({
        next: (params) => {
          let userEMail: string = params['email'];
          this.userService.getUser(userEMail).subscribe({
            next: (userArray) => {
              if (userArray !== null && userArray.length === 1) {
                this.user = userArray[0];
                this.userExists = true;
                this.userRoleFormControl.setValue(this.user.role.name);
                this.userOrgFormControl.setValue(this.user.organisationalUnit.name);  
              } else {
                this.user.errorMessage = "Benutzer existiert nicht.";
              }
            },
            error: (error) => {
            }
          })

        },
        error: (error) => {
        }
      });

    this.userService.getAllRoleTypes().subscribe({
      next: (userRoles) => {
        for (let userRole of userRoles) {
          this.availableUserRoleTypes.push(userRole);
        }
      },
      error: (error) => {
      }
    });

    this.userService.getAllOrgTypes().subscribe({
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
        this.router.navigate(["/users"]);
      },
      error: (error) => {
      }
    })
  }

  updateUser() {
    this.userService.updateUser(this.user).subscribe({
      next: (errorMessage) => {
        ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
        if(errorMessage.errorMessage.trim().length !== 0)
        {
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

  deleteUser() {
    this.userService.deleteUser(this.user.mailAddress).subscribe({
      next: (errorMessage) => {
        ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
        if(errorMessage.errorMessage.trim().length !== 0)
        {
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

  onUserRoleChange() {
    for (let roleType of this.availableUserRoleTypes) {
      if (roleType.name === this.userRoleFormControl.value) {
        this.user.role = roleType;
        continue;
      }
    }
  }

  onUserOrgChange() {
    for (let orgType of this.availableUserOrgTypes) {
      if (orgType.name === this.userOrgFormControl.value) {
        this.user.organisationalUnit = orgType;
        continue;
      }
    }
  }

}
