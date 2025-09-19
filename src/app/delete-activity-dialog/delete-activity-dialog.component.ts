/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 * 
 * DeleteActivityDialogComponent
 * -----------------------------
 * Confirmation dialog for deleting a road work activity.
 *
 * Notes:
 * - Accepts an activity UUID via MAT_DIALOG_DATA.
 * - Optionally captures a free-text delete reason and passes it to the service.
 * - Calls the API; on success closes the dialog, navigates back to the activities list,
 *   and shows a success snackbar. On error, expands coded messages and shows them.
 * 
 */

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';

@Component({
  selector: 'app-delete-activity-dialog',
  templateUrl: './delete-activity-dialog.component.html',
  styleUrls: ['./delete-activity-dialog.component.css']
})

export class DeleteActivityDialogComponent {

  /** Free-text reason provided by the user for auditing/logging on delete. */
  public deleteReason: string = "";

  /** UUID of the road work activity to be deleted (injected via dialog data). */
  private roadWorkActivityUuid: string;

  /** Reference to the material dialog instance to allow programmatic close. */
  private deleteDialogRef: MatDialogRef<DeleteActivityDialogComponent>;
  /** Service to perform the delete request. */
  private roadWorkActivityService: RoadWorkActivityService;
  /** Snackbar for user feedback (errors/success). */
  private snckBar: MatSnackBar;
  /** Router used to navigate back to the activities overview after delete. */
  private router: Router;

  constructor(@Inject(MAT_DIALOG_DATA) data: {roadWorkActivityUuid: string},
      deleteDialogRef: MatDialogRef<DeleteActivityDialogComponent>,
      roadWorkActivityService: RoadWorkActivityService, snckBar: MatSnackBar,
      router: Router) {
    this.deleteDialogRef = deleteDialogRef;
    this.roadWorkActivityService = roadWorkActivityService;
    this.snckBar = snckBar;
    this.router = router;
    this.roadWorkActivityUuid = data.roadWorkActivityUuid;
  }

  /** Close the dialog without performing any action. */
  closeDialog() {
    this.deleteDialogRef.close();
  }

  /**
   * Execute deletion of the activity:
   * - Sends the UUID and optional delete reason to the backend.
   * - Shows an error snackbar if the backend returns a message; otherwise,
   *   closes the dialog, navigates to the activities list, and shows success.
   */
  deleteRoadworkActivity() {
    this.roadWorkActivityService.deleteRoadWorkActivity(this.roadWorkActivityUuid, this.deleteReason).subscribe({
      next: (errorMessage) => {
        if (errorMessage != null && errorMessage.errorMessage != null &&
          errorMessage.errorMessage.trim().length !== 0) {
          ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
          this.snckBar.open(errorMessage.errorMessage, "", {
            duration: 4000
          });
        } else {
          this.deleteDialogRef.close();
          this.router.navigate(["/activities/"]);
          this.snckBar.open("Bauvorhaben wurde gelöscht", "", {
            duration: 4000,
          });
        }
      },
      error: (error) => {
      }
    });
  }

}
