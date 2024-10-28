import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-simple-dialog',
  templateUrl: './simple-dialog.component.html',
  styleUrls: ['./simple-dialog.component.css']
})
export class SimpleDialogComponent {

  public dialogMessage: string = "";

  private dialogRef: MatDialogRef<SimpleDialogComponent>;

  constructor(@Inject(MAT_DIALOG_DATA) data: {infoText: string},
      dialogRef: MatDialogRef<SimpleDialogComponent>) {
    this.dialogRef = dialogRef;
    if(data)
      this.dialogMessage = data.infoText;
  }

  closeDialog() {
    this.dialogRef.close();
  }

}
