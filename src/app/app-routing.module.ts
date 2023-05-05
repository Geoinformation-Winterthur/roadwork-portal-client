/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Vermessungsamt Winterthur. All rights reserved.
 */
 import { NgModule } from '@angular/core';
 import { Routes, RouterModule } from '@angular/router';
 import { ReportComponent } from './report/report.component';
import { UsersComponent } from "./users/users.component";
 import { WelcomeComponent } from './welcome/welcome.component';
 import { LoginComponent } from './login/login.component';
 import { ChooseNeedComponent } from './choose-need/choose-need.component';
 import { NeedAttributesComponent } from './need-attributes/need-attributes.component';
 import { UserService } from 'src/services/user.service';
import { UserComponent } from './user/user.component';
import { ManagementAreasComponent } from './management-areas/management-areas.component';
import { ChooseActivityComponent } from './choose-activity/choose-activity.component';
import { ActivityAttributesComponent } from './activity-attributes/activity-attributes.component';
import { ChooseEventsComponent } from './choose-events/choose-events.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { TestopenidComponent } from './testopenid/testopenid.component';
 
 const routes: Routes = [
   {path: '', component: WelcomeComponent, pathMatch: 'full'},
   {path: 'report', component: ReportComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'chooseneed', component: ChooseNeedComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'chooseactivity', component: ChooseActivityComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'need/:id', component: NeedAttributesComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'activity/:id', component: ActivityAttributesComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'users', component: UsersComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'users/:email', component: UserComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'managementareas', component: ManagementAreasComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'login', component: LoginComponent, pathMatch: 'full'},
   {path: 'events', component: ChooseEventsComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'configuration', component: ConfigurationComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'openid', component: TestopenidComponent, pathMatch: 'full'},
 ];
 
 @NgModule({
   imports: [RouterModule.forRoot(routes)],
   exports: [RouterModule]
 })
 export class AppRoutingModule { }
 