import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {

  private userService: UserService;
  private router: Router;

  constructor(userService: UserService, router: Router) {
    this.userService = userService;
    this.router = router;
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let isUserLoggedIn: boolean = this.userService.isUserLoggedIn();
    if (isUserLoggedIn) {
      return true;
    }
    this.router.navigate(["login"], { queryParams: { returnUrl: state.url }});
    return false;
  }
}