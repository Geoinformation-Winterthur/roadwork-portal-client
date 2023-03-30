/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Vermessungsamt Winterthur. All rights reserved.
 */
 import { Component, EventEmitter, Input, Output } from '@angular/core';
 import { Subscription } from 'rxjs';
 import { MediaChange, MediaObserver } from '@angular/flex-layout';
 import { CookieService } from 'ngx-cookie-service';
 import { MatSnackBar } from '@angular/material/snack-bar';
 import { UserService } from '../services/user.service';
 import { environment } from 'src/environments/environment';
 import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { MatDrawerMode } from '@angular/material/sidenav';
import { Title } from '@angular/platform-browser';
 
 @Component({
   selector: 'app-root',
   templateUrl: './app.component.html',
   styleUrls: ['./app.component.css']
 })
 export class AppComponent {
 
   @Input() isSideNavDisableClose: boolean = true;
   @Output() disableCloseChange: EventEmitter<boolean> = new EventEmitter<boolean>();

   public sideNavOpened: boolean = false;
   public sideNavMode: MatDrawerMode = 'side';
 
   title: string = environment.title;
   shorttitle: string = environment.shorttitle;
   subtitle: string = environment.subtitle;
 
   userService: UserService;
 
   private mediaWatcher: Subscription;
 
   private cookieService: CookieService;
   private snckBar: MatSnackBar;
 
   private roadWorkNeedService: RoadWorkNeedService;
  
   constructor(cookieService: CookieService, snckBar: MatSnackBar, oMedia: MediaObserver,
    roadWorkNeedService: RoadWorkNeedService, userService: UserService, titleService: Title) {
     titleService.setTitle(this.title);
     this.cookieService = cookieService;
     this.roadWorkNeedService = roadWorkNeedService;
     this.userService = userService;
     this.snckBar = snckBar;
     this.mediaWatcher = oMedia.asObservable().subscribe((mChange: MediaChange[]) => {
       if (mChange[0].mqAlias === 'xs') {
         this.sideNavMode = "over";
         this.isSideNavDisableClose = false;
         this.sideNavOpened = false;
        } else {
        this.sideNavMode = "side";
        this.isSideNavDisableClose = true;
        this.sideNavOpened = true;
       }
       this.disableCloseChange.emit(this.isSideNavDisableClose)
      });
     this.showCookieNotification();
   }
 
   ngOnInit() {
   }
 
   public isUserLoggedIn(): boolean {
     return this.userService.isUserLoggedIn();
   }
 
   public logUserOut(event: Event) {
     this.userService.logout();
   }
 
 
   public toggleSideNav(event: Event) {
     if(!this.isSideNavDisableClose) {
        this.sideNavOpened = !this.sideNavOpened;
     }
   }
 
   private showCookieNotification() {
     const hideInfoCookieName: string = environment.hideInfoCookieName;
     let hideInfoValue: string = this.cookieService.get(hideInfoCookieName);
 
     if (hideInfoValue !== 'true') {
       let snckBarHandle = this.snckBar.open('Diese App verwendet Cookies. Nähere Informationen im Impressum.',
         'X', {
         duration: 99999999999999
       });
       snckBarHandle.afterDismissed().subscribe(() => {
         this.cookieService.set(hideInfoCookieName, 'true', 50 * 365, undefined, undefined, false, "Lax");
       });
     }
   }
 
 }
 