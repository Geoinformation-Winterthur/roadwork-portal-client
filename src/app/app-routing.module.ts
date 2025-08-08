/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
 import { NgModule } from '@angular/core';
 import { Routes, RouterModule } from '@angular/router';
 import { ReportComponent } from './report/report.component';
import { UsersComponent } from "./users/users.component";
 import { WelcomeComponent } from './welcome/welcome.component';
 import { LoginComponent } from './login/login.component';
 import { ChooseNeedComponent } from './choose-need/choose-need.component';
 import { NeedAttributesComponent } from './need-attributes/need-attributes.component';
import { UserComponent } from './user/user.component';
import { ManagementAreasComponent } from './management-areas/management-areas.component';
import { ChooseActivityComponent } from './choose-activity/choose-activity.component';
import { ActivityAttributesComponent } from './activity-attributes/activity-attributes.component';
import { ChooseEventsComponent } from './choose-events/choose-events.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { TestopenidComponent } from './testopenid/testopenid.component';
import { EventAttributesComponent } from './event-attributes/event-attributes.component';
import { DataexportComponent } from './dataexport/dataexport.component';
import { AuthGuardService } from 'src/services/auth-guard.service';
import { SessionsComponent } from './sessions/sessions.component';
 
 const routes: Routes = [
   {path: '', component: WelcomeComponent, pathMatch: 'full'},
   {path: 'report', component: ReportComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'needs', component: ChooseNeedComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'activities', component: ChooseActivityComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'needs/:id', component: NeedAttributesComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'activities/:id', component: ActivityAttributesComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'users', component: UsersComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'users/:email', component: UserComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'managementareas', component: ManagementAreasComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'login', component: LoginComponent, pathMatch: 'full'},
   {path: 'events', component: ChooseEventsComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'events/:id', component: EventAttributesComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'configuration', component: ConfigurationComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'dataexport', component: DataexportComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'sessions', component: SessionsComponent, pathMatch: 'full', canActivate: [AuthGuardService]},
   {path: 'openid', component: TestopenidComponent, pathMatch: 'full'},
 ];
 
 @NgModule({
   imports: [RouterModule.forRoot(routes)],
   exports: [RouterModule]
 })
 export class AppRoutingModule { }
 