/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable } from 'rxjs';
import { User } from 'src/model/user';
import { environment } from 'src/environments/environment';
import { Role } from 'src/model/role';
import { ErrorMessage } from 'src/model/error-message';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private user: User = new User();

  private http: HttpClient;

  private jwtHelperService: JwtHelperService;

  public static userTokenName: string = environment.roadworksPortalUserToken;

  constructor(http: HttpClient, jwtHelperService: JwtHelperService) {
    this.http = http;
    this.jwtHelperService = jwtHelperService;

    let userTokenTemp = localStorage.getItem(UserService.userTokenName);
    let userToken: string = userTokenTemp !== null ? userTokenTemp : "";
    this.user = this._readUserFromToken(userToken);
  }

  getLocalUser(): User {
    return this.user;
  }

  login(user: User, successFunc: () => void, errorFunc: () => void) {
    let reqResult: Observable<any> =
      this.http.post(environment.apiUrl + '/account/login', user,
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

    this.http.post(environment.apiUrl + '/account/login/endsession',
      { logoutUser: this.user.mailAddress },
      {
        headers: new HttpHeaders({ "Content-Type": "application/json" })
      })
      .subscribe({
        next: res => console.log("OK"),
        error: err => console.error("Logout failed", err)
      });
    
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
    this.user.grantedRoles = new Role();
    localStorage.clear();
  }

  public getUserFromDB(email: string): Observable<User[]> {
    let result: Observable<User[]> =
      this.http.get(environment.apiUrl + "/account/users/?email=" + email) as Observable<User[]>;
    return result;
  }

  public addUser(user: User): Observable<any> {
    let result: Observable<any> =
      this.http.post(environment.apiUrl + "/account/users/", user) as Observable<any>;
    return result;
  }

  public updateUser(user: User, changePassphrase: boolean = false): Observable<ErrorMessage> {
    let result: Observable<ErrorMessage> =
      this.http.put(environment.apiUrl + "/account/users/?changepassphrase=" + changePassphrase,
        user) as Observable<ErrorMessage>;
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

  hasUserAccess(functionDesc: string): boolean {
    let role: string = this.getLocalUser().chosenRole;
    if (functionDesc === "see_needs_list") {
      if (role === "administrator" ||
        role === "trafficmanager" ||
        role === "territorymanager" ||
        role === "orderer" ||
        role === "view")
        return true;
    } else if (functionDesc === "see_activities_list") {
      if (role === "administrator" ||
        role === "trafficmanager" ||
        role === "territorymanager" ||
        role === "orderer" ||
        role === "view")
        return true;
    } else if (functionDesc === "see_events_list") {
      if (role === "administrator" ||
        role === "trafficmanager" ||
        role === "territorymanager" ||
        role === "eventmanager")
        return true;
    } else if (functionDesc === "conf_management_areas") {
      if (role === "administrator")
        return true;
    } else if (functionDesc === "add_activity") {
      if (role === "administrator" ||
        role === "territorymanager")
        return true;
    } else if (functionDesc === "see_reports") {
      if (role === "administrator")
        return true;
    } else if (functionDesc === "see_management_areas") {
      if (role === "administrator" ||
        role === "territorymanager")
        return true;
    } else if (functionDesc === "app_configuration") {
      if (role === "administrator")
        return true;
    } else if (functionDesc === "data_export") {
      if (role === "administrator")
        return true;
    }
    return false;
  }

  setRole(user: User, roleName: string) {
    if (roleName == "view") user.grantedRoles.view = true;
    else if (roleName == "projectmanager") user.grantedRoles.projectmanager = true;
    else if (roleName == "eventmanager") user.grantedRoles.eventmanager = true;
    else if (roleName == "orderer") user.grantedRoles.orderer = true;
    else if (roleName == "trafficmanager") user.grantedRoles.trafficmanager = true;
    else if (roleName == "territorymanager") user.grantedRoles.territorymanager = true;
    else if (roleName == "administrator") user.grantedRoles.administrator = true;
  }

  getRole(user: User): string {
    if (user.grantedRoles.view) return "view";
    else if (user.grantedRoles.projectmanager) return "projectmanager";
    else if (user.grantedRoles.eventmanager) return "eventmanager";
    else if (user.grantedRoles.orderer) return "orderer";
    else if (user.grantedRoles.trafficmanager) return "trafficmanager";
    else if (user.grantedRoles.territorymanager) return "territorymanager";
    else if (user.grantedRoles.administrator) "administrator";
    return "";
  }


  roleListToString(user: User): string {
    let result: string = "";
    if (user.grantedRoles.view) result += "View ";
    if (user.grantedRoles.projectmanager) result += "Projektleitung ";
    if (user.grantedRoles.eventmanager) result += "Eventmanagement ";
    if (user.grantedRoles.orderer) result += "Auslösende:r ";
    if (user.grantedRoles.trafficmanager) result += "Verkehrsmanagement ";
    if (user.grantedRoles.territorymanager) result += "Gebietsmanagement ";
    if (user.grantedRoles.administrator) result += "Administration ";
    return result;
  }

  getFullUserName(user: User): string {
    if (user) {
      return user.firstName + " " + user.lastName;
    } else {
      return ""
    }
  }

  private _readUserFromToken(userToken: string): User {
    let resultUser: User = new User();
    if (userToken !== null && "" !== userToken) {
      resultUser = new User();
      let tokenDecoded = this.jwtHelperService.decodeToken(userToken);
      resultUser.uuid = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
      resultUser.mailAddress = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
      resultUser.firstName = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"];
      resultUser.lastName = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      resultUser.chosenRole = tokenDecoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      resultUser.initials = "anonym";
      if (resultUser.lastName !== null && resultUser.lastName.length > 1) {
        resultUser.initials = resultUser.lastName[0].toUpperCase() + resultUser.lastName[1].toUpperCase();
      }
    }
    return resultUser;
  }


}
