/**
 * Simple confirmation dialog for deleting a roadwork "need".
 *
 * Notes:
 * - The parent component is expected to open this dialog and handle the actual
 *   deletion once the dialog is closed/confirmed by the user.
 */

import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-need-dialog',
  templateUrl: './delete-need-dialog.component.html',
  styleUrls: ['./delete-need-dialog.component.css']
})

export class DeleteNeedDialogComponent {

  /** Reference to this dialog instance (allows programmatic close). */
  public deleteDialogRef: MatDialogRef<DeleteNeedDialogComponent>;

  /**
   * Inject the dialog reference.
   * @param deleteDialogRef Angular Material dialog reference for this component.
   */
  constructor(deleteDialogRef: MatDialogRef<DeleteNeedDialogComponent>) {
    this.deleteDialogRef = deleteDialogRef;
  }

  /**
   * Closes the dialog without performing any additional action.
   * The caller can interpret the close as a cancel action.
   */
  closeDeleteDialog() {
    this.deleteDialogRef.close();
  }

}
