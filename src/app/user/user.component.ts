import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { UserService } from 'src/services/user.service';
import { User } from '../../model/user';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {

  user: User = new User();
  userExists: boolean = false;

  activeCheckBox: boolean = false;

  private activatedRoute: ActivatedRoute;
  private router: Router;
  private userService: UserService;

  constructor(activatedRoute: ActivatedRoute, userService: UserService,
        router: Router) {
    this.activatedRoute = activatedRoute;
    this.userService = userService;
    this.router = router;
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
          if(userArray !== null && userArray.length > 0){
            this.user = userArray[0];
            this.userExists = true;
          }
        },
        error: (error) => {          
        }
      })

    },
    error: (error) => {
    }
    });

  }

  addUser(){
    this.userService.addUser(this.user).subscribe({
      next: (user) => {
        this.router.navigate(["/users"]);
      },
      error: (error) => {
      }
    })
  }

  updateUser(){
    this.userService.updateUser(this.user).subscribe({
      next: (user) => {
        this.router.navigate(["/users"]);
      },
      error: (error) => {
      }
    })
  }

}
