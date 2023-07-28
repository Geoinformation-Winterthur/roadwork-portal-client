/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable } from 'rxjs';
import { User } from 'src/model/user';
import { environment } from 'src/environments/environment';
import { Role } from 'src/model/role';
import { ErrorMessage } from 'src/model/error-message';

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
    this.user = this._readUserFromToken(userToken);
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
        this.user = this._readUserFromToken(userToken.securityTokenString);
      },
      error: (error) => {
        errorFunc();
      }
    });
  }

  logout() {
    this.clearLocalUser();
  }

  loginWithOpenId(idToken: string, successFunc: () => void, errorFunc: () => void) {
    let reqResult: Observable<any> = this.http.post(environment.apiUrl + '/account/openidlogin', "\"" + idToken + "\"",
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
        this.user = this._readUserFromToken(userToken.securityTokenString);
      },
      error: (error) => {
        errorFunc();
      }
    });
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

  public clearLocalUser() {
    this.user.firstName = "";
    this.user.lastName = "";
    this.user.initials = "";
    this.user.mailAddress = "";
    this.user.passPhrase = "";
    this.user.role = new Role();
    localStorage.clear();
  }

  canActivate() {
    let isUserLoggedIn: boolean = this.isUserLoggedIn();
    if (!isUserLoggedIn) {
      this.router.navigate(["login"]);
    }
    return isUserLoggedIn;
  }

  public getUser(email: string): Observable<User[]> {
    let result: Observable<User[]> =
      this.http.get(environment.apiUrl + "/account/users/?email=" + email) as Observable<User[]>;
    return result;
  }

  public addUser(user: User): Observable<any> {
    let result: Observable<any> =
      this.http.post(environment.apiUrl + "/account/users/", user) as Observable<any>;
    return result;
  }

  public updateUser(user: User): Observable<ErrorMessage> {
    let result: Observable<ErrorMessage> =
      this.http.put(environment.apiUrl + "/account/users/", user) as Observable<ErrorMessage>;
    return result;
  }

  public getAllUsers(): Observable<User[]> {
    let result: Observable<User[]> =
      this.http.get(environment.apiUrl + "/account/users/") as Observable<User[]>;
    return result;
  }

  public getAllTerritoryManagers(): Observable<User[]> {
    let result: Observable<User[]> =
      this.http.get(environment.apiUrl + "/account/users/?role=territorymanager") as Observable<User[]>;
    return result;
  }

  public deleteUser(mailAddress: string): Observable<ErrorMessage> {
    let result: Observable<ErrorMessage> =
      this.http.delete(environment.apiUrl + "/account/users/?email=" + mailAddress) as Observable<ErrorMessage>;
    return result;
  }

  public getAllRoleTypes(): Observable<Role[]> {
    let result: Observable<Role[]> =
      this.http.get(environment.apiUrl + "/account/userroles/") as Observable<Role[]>;
    return result;
  }

  public hasUserAccess(accessRestriction: string): boolean {
    let userRole: string = this.getLocalUser().role.code;

    if (accessRestriction === 'administrator') {
      // Only the administrator can do what the administrator
      // is allowed to do:
      if (userRole === 'administrator') {
        return true;
      } else {
        return false;
      }
    } else if (accessRestriction === 'territorymanager') {
      // Only territorymanager and administrator are allowed
      // to do what the territorymanager is allowed to do:
      if (userRole === 'territorymanager') {
        return true;
      } else if (userRole === 'administrator') {
        return true;
      } else {
        return false;
      }
    } else if (accessRestriction === 'orderer') {
      // Only orderer, territorymanager and administrator
      // are allowed to do what the orderer is allowed
      // to do:
      if (userRole === 'orderer') {
        return true;
      } else if (userRole === 'territorymanager') {
        return true;
      } else if (userRole === 'administrator') {
        return true;
      } else {
        return false;
      }
    } else if (accessRestriction === 'trafficmanager') {
      // Orderer, trafficmanager, territorymanager and administrator
      // are allowed to do what the trafficmanager is allowed to do:
      if (userRole === 'orderer') {
        return true;
      } else if (userRole === 'trafficmanager') {
        return true;
      } else if (userRole === 'territorymanager') {
        return true;
      } else if (userRole === 'administrator') {
        return true;
      } else {
        return false;
      }
    } else if (accessRestriction === 'eventmanager') {
      // All roles are allowed to do what the
      // eventmanager is allowed to do:
      if (userRole === 'eventmanager') {
        return true;
      } else if (userRole === 'orderer') {
        return true;
      } else if (userRole === 'trafficmanager') {
        return true;
      } else if (userRole === 'territorymanager') {
        return true;
      } else if (userRole === 'administrator') {
        return true;
      } else {
        return false;
      }
    } else {
      // if nothing fits, restrict access:
      return false;
    }
  }

  private _readUserFromToken(userToken: string): User {
    let resultUser: User = new User();
    if (userToken !== null && "" !== userToken) {
      resultUser = new User();
      let tokenDecoded = this.jwtHelperService.decodeToken(userToken);
      resultUser.mailAddress = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
      resultUser.firstName = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"];
      resultUser.lastName = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      resultUser.role.code = tokenDecoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      resultUser.initials = "anonym";
      if (resultUser.lastName !== null && resultUser.lastName.length > 1) {
        resultUser.initials = resultUser.lastName[0].toUpperCase() + resultUser.lastName[1].toUpperCase();
      }
    }
    return resultUser;
  }


}
