/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 *
 * UsersComponent
 * -----------------
 * Component to list and manage users.
 * - Displays all users in a table with columns for edit action, name, email, role, and organisation.
 * - Supports deletion of a user and updates the table data locally on success.
 *
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

  /** Column definition for the users material table. */
  displayedColumns: string[] = ['editAction', 'firstName', 'lastName', 'mailAddress', 'role', 'organisation', 'workArea', 'isDistributionList', 'isParticipantList'];

  /** Table datasource containing all users fetched from the backend. */
  dataSource: User[] = [];

  /** Message shown in the UI after operations (success or error). */
  responseMessage: string = "";

  /** Injected user service used to load and delete users. */
  userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  /**
   * Lifecycle: fetch the complete list of users on initialization
   * and bind the result to the table's datasource.
   */
  ngOnInit(): void {
    this.userService.getAllUsers().subscribe(
      usersList => {
        this.dataSource = usersList;
      }, error => {
        // Optionally set a user-facing message; kept silent here to preserve behavior.
      });
  }

  /**
   * Delete a user by email address.
   * - On success: removes the user from the local datasource (immutable splice pattern)
   *   and sets a success message.
   * - On error: writes the backend error response into `responseMessage`.
   *
   * @param mailAddress Unique identifier (email) of the user to delete.
   */
  deleteUser(mailAddress: string){
    this.userService.deleteUser(mailAddress).subscribe(
      success => {
        // Find the index of the user to remove.
        let count: number = 0;
        for(let user of this.dataSource){
          if(user.mailAddress === mailAddress){
            break;
          }
          count++;
        }
        // Copy the array, remove the entry by index, and reassign for change detection.
        let dataSourceCopy = this.dataSource.slice();
        dataSourceCopy.splice(count, 1);
        this.dataSource = dataSourceCopy;

        // Inform the UI of success.
        this.responseMessage = "Benutzer efolgreich gelöscht";
      }, (error: HttpErrorResponse) => {
        // Display the error payload returned by the backend.
        this.responseMessage = error.error;
      });
  }

}
