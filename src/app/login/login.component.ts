/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
 import { Component, OnInit } from '@angular/core';
 import { NgForm } from '@angular/forms';
 import { ActivatedRoute, Router } from '@angular/router';
 import { UserService } from 'src/services/user.service';
 import { User } from '../../model/user';
 
 @Component({
   selector: 'app-login',
   templateUrl: './login.component.html',
   styleUrls: ['./login.component.css']
 })
 /**
  * The LoginComponent defines the interface for the user
  * login page of the roadworks-portal web application.
  */
 export class LoginComponent implements OnInit {
 
   loginInvalid: boolean = false;
   chosenRole: string = "";
 
   private router: Router;
   private route: ActivatedRoute;
   private userService: UserService;
 
   constructor(router: Router, route: ActivatedRoute, userService: UserService) {
     this.router = router;
     this.route = route;
     this.userService = userService;
    }
 
   ngOnInit(): void {
   }
 
   loginUser(ngForm: NgForm){
 
     let user: User = new User();
     user.mailAddress = ngForm.value.loginname;
     user.passPhrase = ngForm.value.password;
     user.chosenRole = this.chosenRole;
 
     this.userService.login(user, 
          () => {
            // in the case of login success:
            this.loginInvalid = false;
            let returnUrl = this.route.snapshot.queryParams['returnUrl'] || "/";
            this.router.navigateByUrl(returnUrl);
          }, 
          () => {
            // in the case of login failure (error):
            this.loginInvalid = true;
          });
   }
 
 }
 