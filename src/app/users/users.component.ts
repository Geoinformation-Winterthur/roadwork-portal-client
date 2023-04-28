/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { UserService } from '../../services/user.service';
import { User } from '../../model/user';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent {

  displayedColumns: string[] = ['editAction', 'lastName', 'firstName', 'mailAddress', 'role', 'organisation'];
  dataSource: User[] = [];  

  responseMessage: string = "";

  userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  ngOnInit(): void {
    this.userService.getAllUsers().subscribe(
      usersList => {
        this.dataSource = usersList;
      }, error => {
      });
  }

  deleteUser(mailAddress: string){
    this.userService.deleteUser(mailAddress).subscribe(
      success => {
        let count: number = 0;
        for(let user of this.dataSource){
          if(user.mailAddress === mailAddress){
            break;
          }
          count++;
        }
        let dataSourceCopy = this.dataSource.slice();
        dataSourceCopy.splice(count, 1);
        this.dataSource = dataSourceCopy;
        this.responseMessage = "Benutzer efolgreich gelöscht";
      }, (error: HttpErrorResponse) => {
        this.responseMessage = error.error;
      });
  }

}
