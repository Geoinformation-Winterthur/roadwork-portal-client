/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Vermessungsamt Winterthur. All rights reserved.
 */
 import { BrowserModule } from '@angular/platform-browser';
 import { NgModule } from '@angular/core';
 
 import { HttpClientModule } from '@angular/common/http';
 import { AppRoutingModule } from './app-routing.module';
 import { AppComponent } from './app.component';
 import { MatButtonModule } from '@angular/material/button';
 import { MatToolbarModule } from '@angular/material/toolbar';
 import { MatIconModule } from '@angular/material/icon';
 import { MatListModule } from '@angular/material/list';
 import { MatTableModule } from '@angular/material/table';
 import { MatCardModule } from '@angular/material/card';
 import { MatSnackBarModule } from '@angular/material/snack-bar';
 import { MatSliderModule } from '@angular/material/slider';
 import { MatTooltipModule } from '@angular/material/tooltip';
 import { MatMenuModule } from '@angular/material/menu';
 import { MatChipsModule } from '@angular/material/chips';
 import { MatFormFieldModule } from '@angular/material/form-field';
 import { MatInputModule } from '@angular/material/input';
 import { MatCheckboxModule } from '@angular/material/checkbox';
 import { MatDatepickerModule } from '@angular/material/datepicker';
 import { MatNativeDateModule } from '@angular/material/core';
 import { MatSelectModule } from '@angular/material/select';
 import { MatExpansionModule } from '@angular/material/expansion';
 import { FormsModule, ReactiveFormsModule } from '@angular/forms';
 import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
 import { FlexLayoutModule } from '@angular/flex-layout';
 import { MAT_DATE_LOCALE } from '@angular/material/core';
 import { ReportComponent } from './report/report.component';
 import { MatSidenavModule } from '@angular/material/sidenav';
 import { WelcomeComponent } from './welcome/welcome.component';
import { UsersComponent } from "./users/users.component";
 import { MatTabsModule } from '@angular/material/tabs';
 import { MatAutocompleteModule } from '@angular/material/autocomplete';
 import { MatProgressBarModule } from '@angular/material/progress-bar';
 import { MatGridListModule } from '@angular/material/grid-list';
 import { ServiceWorkerModule } from '@angular/service-worker';
 import { environment } from '../environments/environment';
 import { LoginComponent } from './login/login.component';
 
 import { JwtModule } from '@auth0/angular-jwt';
 import { ChooseNeedComponent } from './choose-need/choose-need.component';
 
 import { ChartsModule } from 'ng2-charts';
 import { UserService } from 'src/services/user.service';
import { UserComponent } from './user/user.component';
import { NeedNameFilterComponent } from './need-name-filter/need-name-filter.component';
import { NeedYearFilterComponent } from './need-year-filter/need-year-filter.component';
import { NeedAttributesComponent } from './need-attributes/need-attributes.component';
import { EditNeedMapComponent } from './edit-need-map/edit-need-map.component';
import { ManagementAreasComponent } from './management-areas/management-areas.component';
import { ChooseActivityComponent } from './choose-activity/choose-activity.component';
import { ActivityAttributesComponent } from './activity-attributes/activity-attributes.component';
import { EditActivityMapComponent } from './edit-activity-map/edit-activity-map.component';
import { ChooseEventsComponent } from './choose-events/choose-events.component';
import { ConfigurationComponent } from './configuration/configuration.component';
 
 
 export function getToken(){
   let userTokenTemp = localStorage.getItem(UserService.userTokenName);
   let userToken: string = userTokenTemp !== null ? userTokenTemp : "";
   if(userToken !== ""){
     return userToken;
   } else {
     return null;
   }
 }
 
 @NgModule({
   declarations: [
     AppComponent,
     ReportComponent,
     WelcomeComponent,
     UsersComponent,
     LoginComponent,
     ChooseNeedComponent,
     UserComponent,
     NeedNameFilterComponent,
     NeedYearFilterComponent,
     NeedAttributesComponent,
     EditNeedMapComponent,
     ManagementAreasComponent,
     ChooseActivityComponent,
     ActivityAttributesComponent,
     EditActivityMapComponent,
     ChooseEventsComponent,
     ConfigurationComponent
   ],
   imports: [
     BrowserModule,
     AppRoutingModule,
     HttpClientModule,
     MatButtonModule,
     MatToolbarModule,
     MatIconModule,
     MatListModule,
     MatCardModule,
     MatSnackBarModule,
     MatTooltipModule,
     MatMenuModule,
     MatChipsModule,
     MatSliderModule,
     MatFormFieldModule,
     MatInputModule,
     MatCheckboxModule,
     ReactiveFormsModule,
     BrowserAnimationsModule,
     FormsModule,
     FlexLayoutModule,
     MatDatepickerModule,
     MatNativeDateModule,
     MatSelectModule,
     MatGridListModule,
     MatAutocompleteModule,
     MatProgressBarModule,
     MatExpansionModule,
     MatSidenavModule,
     MatTableModule,
     MatTabsModule,
     ChartsModule,
     ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
     JwtModule.forRoot({
       config: {
         tokenGetter: getToken,
         allowedDomains: [environment.apiDomain],
         disallowedRoutes: []
       }
     })
   ],
   providers: [UserService, MatDatepickerModule,
     {provide: MAT_DATE_LOCALE, useValue: 'de-CH'}
   ],
   bootstrap: [AppComponent]
 })
 export class AppModule { }
 