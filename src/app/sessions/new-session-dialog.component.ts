import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

@Component({
  selector: 'app-new-session-dialog',
  template: `
    <h2 mat-dialog-title>Neue Sitzung erstellen</h2>

    <mat-dialog-content
      [formGroup]="form"
      style="padding-top: 8px; display: grid; gap: 12px;"
    >
      <p>
        Die neue Sitzung wird automatisch mit der nächsten verfügbaren SKS-Nummer vorgeschlagen.
        Sie können die Nummer bei Bedarf anpassen.
      </p>

      <mat-form-field appearance="outline">
        <mat-label>SKS-Nr</mat-label>
        <input
          matInput
          type="number"
          formControlName="sksNo"
          autocomplete="off"
          min="1"
        />

        <mat-error *ngIf="form.controls['sksNo']?.hasError('required')">
          Pflichtfeld.
        </mat-error>
        <mat-error *ngIf="form.controls['sksNo']?.hasError('min')">
          Die SKS-Nr muss ≥ 1 sein.
        </mat-error>
        <mat-error *ngIf="form.controls['sksNo']?.hasError('pattern')">
          Nur ganze Zahlen sind erlaubt.
        </mat-error>
        <mat-error *ngIf="form.controls['sksNo']?.hasError('sksNoTaken')">
          Diese SKS-Nr ist bereits vergeben.
        </mat-error>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Abbrechen</button>
      <button
        mat-raised-button
        color="primary"
        (click)="submit()"
        [disabled]="form.invalid"
      >
        Erstellen
      </button>
    </mat-dialog-actions>
  `
})
export class NewSessionDialogComponent {
  /** Reactive form holding the (editable) SKS number */
  form: FormGroup;

  /** Existing SKS numbers used for duplicate-check */
  private existingSksNumbers: Set<number>;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<NewSessionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sessions: any[] }
  ) {
    // Build set of existing SKS numbers
    this.existingSksNumbers = new Set(
      (data?.sessions ?? [])
        .map(s => Number(s.sksNo))
        .filter(n => !isNaN(n) && n > 0)
    );

    const nextSksNo = this.computeNextSksNo(data?.sessions ?? []);

    this.form = this.fb.group({
      sksNo: [
        nextSksNo,
        [
          Validators.required,
          Validators.min(1),
          Validators.pattern(/^[0-9]+$/),
          this.sksNoNotTakenValidator()
        ]
      ]
    });
  }

  /** Computes max(sksNo) + 1 from the existing sessions list */
  private computeNextSksNo(sessions: any[]): number {
    if (!sessions || sessions.length === 0) {
      return 1;
    }

    const numbers = sessions
      .map(s => Number(s.sksNo))
      .filter(n => !isNaN(n) && n > 0);

    if (!numbers.length) {
      return 1;
    }

    return Math.max(...numbers) + 1;
  }

  /** Custom validator: checks if SKS number is already used */
  private sksNoNotTakenValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const raw = control.value;
      const value = Number(raw);
      if (!value || isNaN(value)) {
        // Let other validators (required / pattern / min) handle this
        return null;
      }

      if (this.existingSksNumbers.has(value)) {
        return { sksNoTaken: true };
      }

      return null;
    };
  }

  submit() {
    if (this.form.invalid) return;

    const raw = this.form.value.sksNo;
    const sksNo = Number(raw);

    this.dialogRef.close({ sksNo });
  }
}
