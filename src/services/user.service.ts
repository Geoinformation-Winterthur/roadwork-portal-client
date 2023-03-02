/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Vermessungsamt Winterthur. All rights reserved.
 */
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable } from 'rxjs';
import { User } from 'src/model/user';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService implements CanActivate {

  private user: User = new User();

  private http: HttpClient;

  private jwtHelperService: JwtHelperService;

  private router: Router;

  public static userTokenName: string = environment.roadworksPortalUserToken;

  constructor(http: HttpClient, jwtHelperService: JwtHelperService,
    router: Router) {
    this.http = http;
    this.jwtHelperService = jwtHelperService;
    this.router = router;

    let userTokenTemp = localStorage.getItem(UserService.userTokenName);
    let userToken: string = userTokenTemp !== null ? userTokenTemp : "";
    this.user = this.readUserFromToken(userToken);
  }

  getLocalUser(): User {
    return this.user;
  }

  login(user: User, successFunc: () => void, errorFunc: () => void) {
    let reqResult: Observable<any> = this.http.post(environment.apiUrl + '/account/login', user,
      {
        headers: new HttpHeaders({
          "Content-Type": "application/json"
        })
      }) as Observable<any>;
    reqResult.subscribe({
      next: (userToken) => {
          // success:
          successFunc();
          this.clearLocalUser();
          localStorage.setItem(UserService.userTokenName, userToken.securityTokenString);
          this.user = this.readUserFromToken(userToken.securityTokenString);
        },
      error: (error) => {
          errorFunc();
        }
    });
  }

  logout() {
    this.clearLocalUser();
  }

  public isUserLoggedIn(): boolean {
    let userTokenTemp = localStorage.getItem(UserService.userTokenName);
    let userToken: string = userTokenTemp !== null ? userTokenTemp : "";
    if (this.user.mailAddress !== "" && userToken !== "" && !this.jwtHelperService.isTokenExpired(userToken)) {
      return true;
    } else {
      return false;
    }
  }

  clearLocalUser() {
    this.user.firstName = "";
    this.user.lastName = "";
    this.user.initials = "";
    this.user.mailAddress = "";
    this.user.passPhrase = "";
    this.user.role = "";
    localStorage.clear();
  }

  canActivate() {
    let isUserLoggedIn: boolean = this.isUserLoggedIn();
    if (!isUserLoggedIn) {
      this.router.navigate(["login"]);
    }
    return isUserLoggedIn;
  }

  private readUserFromToken(userToken: string): User {
    let resultUser: User = new User();
    if (userToken !== null && "" !== userToken) {
      resultUser = new User();
      let tokenDecoded = this.jwtHelperService.decodeToken(userToken);
      resultUser.mailAddress = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
      resultUser.firstName = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"];
      resultUser.lastName = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      resultUser.role = tokenDecoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      resultUser.initials = "anonym";
      if (resultUser.lastName !== null && resultUser.lastName.length > 1) {
        resultUser.initials = resultUser.lastName[0].toUpperCase() + resultUser.lastName[1].toUpperCase();
      }
    }
    return resultUser;
  }

  getUser(email: string): Observable<User[]> {
    let result: Observable<User[]> =
      this.http.get(environment.apiUrl + "/account/users/?email=" + email) as Observable<User[]>;
    return result;
  }

  addUser(user: User): Observable<any> {
    let result: Observable<any> =
      this.http.post(environment.apiUrl + "/account/users/", user) as Observable<any>;
    return result;
  }

  updateUser(user: User): Observable<any> {
    let result: Observable<any> =
      this.http.put(environment.apiUrl + "/account/users/", user) as Observable<any>;
    return result;
  }

  getAllUsers(): Observable<User[]> {
    let result: Observable<User[]> =
      this.http.get(environment.apiUrl + "/account/users/") as Observable<User[]>;
    return result;
  }

  deleteUser(mailAddress: string): Observable<string> {
    let result: Observable<string> =
      this.http.delete(environment.apiUrl + "/account/users/?email=" + mailAddress) as Observable<string>;
    return result;
  }


}
