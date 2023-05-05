import { Component, OnInit } from '@angular/core';
import { JwksValidationHandler, OAuthService } from 'angular-oauth2-oidc';
import { UserService } from 'src/services/user.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-testopenid',
  templateUrl: './testopenid.component.html',
  styleUrls: ['./testopenid.component.css']
})
export class TestopenidComponent implements OnInit {

  oauthService: OAuthService;
  userService: UserService;

  private openIdToken: string = "";

  constructor(oauthService: OAuthService, userService: UserService) {
    this.oauthService = oauthService;
    this.userService = userService;
    this.oauthService.configure(environment);
    this.oauthService.tokenValidationHandler = new JwksValidationHandler();
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  ngOnInit(): void {
  }

  get openIdIsLoggedIn() {
    if(this.openIdToken && this.openIdToken !== ""){
      return true;
    } else {
      if(this.oauthService.getIdToken()){
        this.openIdToken = this.oauthService.getIdToken();

        this.userService.loginWithOpenId(this.oauthService.getIdToken(), 
          () => {
          }, 
          () => {
          });  
      }
      return !!this.oauthService.getIdToken();
    }
  }

  openIdHandleLoginClick() {
    if (this.openIdIsLoggedIn) {
      this.oauthService.logOut();
    } else {
      this.oauthService.initLoginFlow();
    }
  }

  get claims() {
    return this.oauthService.getIdentityClaims() as any;
  }

}
