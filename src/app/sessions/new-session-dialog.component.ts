import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-new-session-dialog',
  template: `
  <h2 mat-dialog-title>Neue Sitzung erstellen</h2>
  <mat-dialog-content [formGroup]="form" style="display:grid; gap:12px; padding-top:8px;">
    <mat-form-field appearance="outline">
      <mat-label>Geplantes Datum</mat-label>      
      <input
        matInput
        [matDatepicker]="picker"
        formControlName="plannedDate"
        placeholder="YYYY-MM-DD"
        autocomplete="off"
        inputmode="none"
        readonly
        appPreventTyping
       
      />
      <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
      <mat-datepicker #picker></mat-datepicker>
      <mat-error *ngIf="form.controls['plannedDate']?.hasError('required')">
        Pflichtfeld
      </mat-error>
    </mat-form-field>

    <br/>
    <label>Die folgenden Felder können auch später ergänzt werden.</label>    

    <mat-form-field appearance="outline">
      <mat-label>1. Abnahme SKS-Protokoll</mat-label>
      <textarea matInput formControlName="acceptance1" maxlength="1000" placeholder="Bis zu 1000 Zeichen…"></textarea>
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Beilagen</mat-label>
      <textarea matInput formControlName="attachments" maxlength="1000" placeholder="Bis zu 1000 Zeichen…"></textarea>
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Verschiedenes</mat-label>
      <textarea matInput formControlName="miscItems" maxlength="1000" placeholder="Bis zu 1000 Zeichen…"></textarea>
    </mat-form-field>
  </mat-dialog-content>
  <mat-dialog-actions align="end">
    <button mat-button (click)="dialogRef.close()">Abbrechen</button>
    <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid">Erstellen</button>
  </mat-dialog-actions>
  `
})
export class NewSessionDialogComponent {
  // Keep payload minimal; DB has defaults.
  form = this.fb.group({
    plannedDate: [new Date(), Validators.required],
    acceptance1: ['Das Protokoll wird ohne Anmerkungen verdankt.'],
    attachments: ['Keine'],
    miscItems: ['Keine'],
  });

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<NewSessionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  submit() {
    if (this.form.invalid) return;
    const v = this.form.value;
    // Normalize date to YYYY-MM-DD string
    const plannedDate = v.plannedDate instanceof Date
      ? v.plannedDate.toISOString().slice(0,10)
      : v.plannedDate;
    this.dialogRef.close({ ...v, plannedDate });
  }
}
