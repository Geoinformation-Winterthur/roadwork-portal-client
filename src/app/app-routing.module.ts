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
 import { ChooseProjectComponent } from './choose-project/choose-project.component';
 import { ProjectAttributesComponent } from './project-attributes/project-attributes.component';
 import { UserService } from 'src/services/user.service';
import { UserComponent } from './user/user.component';
import { EditProjectMapComponent } from './edit-project-map/edit-project-map.component';
 
 const routes: Routes = [
   {path: '', component: WelcomeComponent, pathMatch: 'full'},
   {path: 'report', component: ReportComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'chooseproject', component: ChooseProjectComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'projectattributes/:id', component: ProjectAttributesComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'map/:id', component: EditProjectMapComponent, pathMatch: 'full', canActivate: [UserService]}, // TODO: remove
   {path: 'users', component: UsersComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'user/:email', component: UserComponent, pathMatch: 'full', canActivate: [UserService]},
   {path: 'login', component: LoginComponent, pathMatch: 'full'}
 ];
 
 @NgModule({
   imports: [RouterModule.forRoot(routes)],
   exports: [RouterModule]
 })
 export class AppRoutingModule { }
 