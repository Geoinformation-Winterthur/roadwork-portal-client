/**
 * @author Lukas Hollenstein (GEOBOX AG)
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-need-creation-dialog',
  templateUrl: './need-creation-dialog.component.html',
  styleUrls: ['./need-creation-dialog.component.css']
})
export class NeedCreationDialogComponent implements OnInit {

  private router: Router;
  private dialogRef: MatDialogRef<NeedCreationDialogComponent>;


  constructionDurationDays: number | null = null;

  constructor(
    router: Router,
    dialogRef: MatDialogRef<NeedCreationDialogComponent>) {
    this.router = router;
    this.dialogRef = dialogRef;
  }

  ngOnInit(): void {
  }

  isInteger(value: number | null): boolean {
    return value !== null && Number.isInteger(value);
  }

  isNeedMinor(value: number | null): boolean {
    let days: number = 0;

    if (value !== null) {
      days = value;
    }
    return days <= 29;
  }

  openPage(page: string): void {
    if (this.constructionDurationDays === null || !Number.isInteger(this.constructionDurationDays)) {
      return;
    }

    this.dialogRef.close();

    this.router.navigate([page, 'new'], {
      queryParams: { days: this.constructionDurationDays }
    });
  }
}
