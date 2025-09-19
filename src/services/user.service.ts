/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 * 
 * UserService
 * ------------
 * Service for user management (login, logout, user data, user roles, etc.)
 * 
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

  // Holds the currently logged-in user that is kept in memory (decoded from JWT)
  private user: User = new User();

  // Angular HTTP client used for API calls
  private http: HttpClient;

  // Helper for decoding and validating JWT tokens
  private jwtHelperService: JwtHelperService;

  // LocalStorage key under which the JWT is stored
  public static userTokenName: string = environment.roadworksPortalUserToken;

  constructor(http: HttpClient, jwtHelperService: JwtHelperService) {
    this.http = http;
    this.jwtHelperService = jwtHelperService;

    // On service construction, try to read a token from localStorage and decode user data
    let userTokenTemp = localStorage.getItem(UserService.userTokenName);
    let userToken: string = userTokenTemp !== null ? userTokenTemp : "";
    this.user = this._readUserFromToken(userToken);
  }

  // Returns the in-memory user decoded from the token at startup/login
  getLocalUser(): User {
    return this.user;
  }

  // Performs username/password login, executes callbacks for success/failure
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
        // On success: execute provided callback, clear local user, persist token, decode new user
        // NOTE: successFunc() is called before token persistence; ensure callers don't depend on token being set already.
        successFunc();
        this.clearLocalUser();
        localStorage.setItem(UserService.userTokenName, userToken.securityTokenString);
        this.user = this._readUserFromToken(userToken.securityTokenString);
      },
      error: (error) => {
        // On error: execute provided error callback
        errorFunc();
      }
    });
  }

  // Logs out user on the backend and clears local state
  logout() {

    // Inform backend that the session should end (best effort)
    this.http.post(environment.apiUrl + '/account/login/endsession',
      { logoutUser: this.user.mailAddress },
      {
        headers: new HttpHeaders({ "Content-Type": "application/json" })
      })
      .subscribe({
        next: res => console.log("OK"),
        error: err => console.error("Logout failed", err)
      });
    
    // Remove local user data and token
    this.clearLocalUser();
  }

  // Performs OpenID Connect login with an ID token, then stores/decodes application token
  loginWithOpenId(idToken: string, successFunc: () => void, errorFunc: () => void) {
    // Sends the raw idToken as JSON string to the backend (API expects a quoted string)
    let reqResult: Observable<any> = this.http.post(environment.apiUrl + '/account/openidlogin', "\"" + idToken + "\"",
      {
        headers: new HttpHeaders({
          "Content-Type": "application/json"
        })
      }) as Observable<any>;
    reqResult.subscribe({
      next: (userToken) => {
        // On success: execute callback, reset local user, persist application token, decode user
        // NOTE: successFunc() is called before token persistence; ensure callers don't depend on token being set already.
        successFunc();
        this.clearLocalUser();
        localStorage.setItem(UserService.userTokenName, userToken.securityTokenString);
        this.user = this._readUserFromToken(userToken.securityTokenString);
      },
      error: (error) => {
        // On error: execute error callback
        errorFunc();
      }
    });
  }

  // Checks if a user is considered logged in: token exists and is not expired
  public isUserLoggedIn(): boolean {
    let userTokenTemp = localStorage.getItem(UserService.userTokenName);
    let userToken: string = userTokenTemp !== null ? userTokenTemp : "";
    if (this.user.mailAddress !== "" && userToken !== "" && !this.jwtHelperService.isTokenExpired(userToken)) {
      return true;
    } else {
      return false;
    }
  }

  // Resets in-memory user and clears all localStorage
  // NOTE: This clears the entire localStorage, not just the auth token.
  //       If the app stores other keys, those will be removed as well.
  public clearLocalUser() {
    this.user.firstName = "";
    this.user.lastName = "";
    this.user.initials = "";
    this.user.mailAddress = "";
    this.user.passPhrase = "";
    this.user.grantedRoles = new Role();
    localStorage.clear();
  }

  // Loads users by email from backend (returns array, typically with 0–1 items)
  public getUserFromDB(email: string): Observable<User[]> {
    let result: Observable<User[]> =
      this.http.get(environment.apiUrl + "/account/users/?email=" + email) as Observable<User[]>;
    return result;
  }

  // Creates a new user on the backend
  public addUser(user: User): Observable<any> {
    let result: Observable<any> =
      this.http.post(environment.apiUrl + "/account/users/", user) as Observable<any>;
    return result;
  }

  // Updates a user; optionally triggers password change on backend
  public updateUser(user: User, changePassphrase: boolean = false): Observable<ErrorMessage> {
    let result: Observable<ErrorMessage> =
      this.http.put(environment.apiUrl + "/account/users/?changepassphrase=" + changePassphrase,
        user) as Observable<ErrorMessage>;
    return result;
  }

  // Retrieves the full list of users
  public getAllUsers(): Observable<User[]> {
    let result: Observable<User[]> =
      this.http.get(environment.apiUrl + "/account/users/") as Observable<User[]>;
    return result;
  }

  // Retrieves all users who have the 'territorymanager' role
  public getAllTerritoryManagers(): Observable<User[]> {
    let result: Observable<User[]> =
      this.http.get(environment.apiUrl + "/account/users/?role=territorymanager") as Observable<User[]>;
    return result;
  }

  // Deletes a user by email; returns a standardized ErrorMessage from backend
  public deleteUser(mailAddress: string): Observable<ErrorMessage> {
    let result: Observable<ErrorMessage> =
      this.http.delete(environment.apiUrl + "/account/users/?email=" + mailAddress) as Observable<ErrorMessage>;
    return result;
  }

  // Coarse-grained authorization checks for UI features based on chosenRole
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
    } else if (functionDesc === "sessions") {
      if (role === "administrator" ||
        role === "territorymanager")
        return true;
    }
    
    return false;
  }

  // Sets a role flag on the passed user (adds role without clearing existing ones)
  setRole(user: User, roleName: string) {
    if (roleName == "view") user.grantedRoles.view = true;
    else if (roleName == "projectmanager") user.grantedRoles.projectmanager = true;
    else if (roleName == "eventmanager") user.grantedRoles.eventmanager = true;
    else if (roleName == "orderer") user.grantedRoles.orderer = true;
    else if (roleName == "trafficmanager") user.grantedRoles.trafficmanager = true;
    else if (roleName == "territorymanager") user.grantedRoles.territorymanager = true;
    else if (roleName == "administrator") user.grantedRoles.administrator = true;
  }

  // Derives a single string role name from the flags (first match wins)
  // NOTE: There is no `return` for administrator here; the last line evaluates a string
  //       literal without returning it. That means "administrator" is never returned.
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


  // Builds a human-readable concatenation of all granted roles in German
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

  // Returns "FirstName LastName" or empty string if user is not set
  getFullUserName(user: User): string {
    if (user) {
      return user.firstName + " " + user.lastName;
    } else {
      return ""
    }
  }

  // Decodes a JWT token and maps standard claim values into a User model
  // Missing/invalid tokens result in an "empty" user object.
  private _readUserFromToken(userToken: string): User {
    let resultUser: User = new User();
    if (userToken !== null && "" !== userToken) {
      resultUser = new User();
      let tokenDecoded = this.jwtHelperService.decodeToken(userToken);
      // Common Microsoft / XML claim URIs are used here to pick out fields
      resultUser.uuid = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
      resultUser.mailAddress = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
      resultUser.firstName = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"];
      resultUser.lastName = tokenDecoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"];
      resultUser.chosenRole = tokenDecoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
      // Fallback initials are taken from lastName (first two letters uppercased)
      resultUser.initials = "anonym";
      if (resultUser.lastName !== null && resultUser.lastName.length > 1) {
        resultUser.initials = resultUser.lastName[0].toUpperCase() + resultUser.lastName[1].toUpperCase();
      }
    }
    return resultUser;
  }


}
