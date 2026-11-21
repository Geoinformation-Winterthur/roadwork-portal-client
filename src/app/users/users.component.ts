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
import { Component, ViewChild  } from '@angular/core';
import { UserService } from '../../services/user.service';
import { User } from '../../model/user';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent {

  @ViewChild(MatSort) sort!: MatSort;
  
  /** Column definition for the users material table. */
  displayedColumns: string[] = ['editAction', 'firstName', 'lastName', 'mailAddress', 'role', 'organisation', 'workArea', 'isDistributionList', 'isParticipantList', 'isDistributionListMinorWork', 'isParticipantListMinorWork', 'active'];

  /** Table datasource containing all users fetched from the backend. */
  dataSource = new MatTableDataSource<User>();

  /** Message shown in the UI after operations (success or error). */
  responseMessage: string = "";

  /** Injected user service used to load and delete users. */
  userService: UserService;
  
  /** Holds the text and active filters */
  filterText = '';
  activeFilter = 'all';

  constructor(userService: UserService) {
    this.userService = userService;
  }

  /**
   * Lifecycle: fetch the complete list of users on initialization
   * and bind the result to the table's datasource, initialise the filter.
   */
  ngOnInit(): void {
    this.userService.getAllUsers().subscribe(
      usersList => {
        this.dataSource.data = usersList;
      }, error => {
        // Optionally set a user-facing message; kept silent here to preserve behavior.
      });

    // init filters
    this.dataSource.filterPredicate = (user: User, filter: string) => {

      const filterData = JSON.parse(filter);

      // textsearch
      const searchText = [
        user.firstName,
        user.lastName,
        user.mailAddress,
        user.workArea,
        user.organisationalUnit?.name,
        this.userService.roleListToString(user)
      ]
        .join(' ')
        .toLowerCase();

      const matchesText = searchText.includes(filterData.text);

      // active/inactiv filter
      const matchesActive =
        filterData.active === 'all' ||
        (filterData.active === 'active' && user.active) ||
        (filterData.active === 'inactive' && !user.active);

      return matchesText && matchesActive;
    };
  }

  /**
   * Add filter support for nested properties.
   */
  ngAfterViewInit() {

    this.dataSource.sortingDataAccessor = (user: User, property: string) => {
      switch (property) {
        case 'role':
          return this.userService.roleListToString(user);

        case 'organisation':
          return user.organisationalUnit?.name ?? '';

        default:
          return (user as any)[property];
      }
    };
    this.dataSource.sort = this.sort;
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
        for(let user of this.dataSource.data){
          if(user.mailAddress === mailAddress){
            break;
          }
          count++;
        }
        // Copy the array, remove the entry by index, and reassign for change detection.
        let dataSourceCopy = this.dataSource.data.slice();
        dataSourceCopy.splice(count, 1);
        this.dataSource.data = dataSourceCopy;

        // Inform the UI of success.
        this.responseMessage = "Benutzer efolgreich gelöscht";
      }, (error: HttpErrorResponse) => {
        // Display the error payload returned by the backend.
        this.responseMessage = error.error;
      });
  }

  /**
   * Apply the text filter.
   */
  applyFilter(event: Event): void {
    this.filterText = (event.target as HTMLInputElement).value
      .trim()
      .toLowerCase();

    this.applyFilters();
  }

  /**
   * Apply the active/inactive and text filter.
   */
  applyFilters(): void {

    this.dataSource.filter = JSON.stringify({
      text: this.filterText,
      active: this.activeFilter
    });
  }
}
