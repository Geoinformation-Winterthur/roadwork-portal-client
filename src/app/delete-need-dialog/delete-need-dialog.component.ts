import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-need-dialog',
  templateUrl: './delete-need-dialog.component.html',
  styleUrls: ['./delete-need-dialog.component.css']
})
export class DeleteNeedDialogComponent {

  public deleteDialogRef: MatDialogRef<DeleteNeedDialogComponent>;


  constructor(deleteDialogRef: MatDialogRef<DeleteNeedDialogComponent>) {
    this.deleteDialogRef = deleteDialogRef;
  }

  closeDeleteDialog() {
    this.deleteDialogRef.close();
  }

}
