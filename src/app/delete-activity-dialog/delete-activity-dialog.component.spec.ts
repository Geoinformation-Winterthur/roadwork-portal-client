// delete-activity-dialog.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { DeleteActivityDialogComponent } from './delete-activity-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

// Wichtig: den echten Klassentoken importieren
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';

// --- sehr einfache Mocks ---
const roadWorkActivityServiceMock = {
  deleteRoadWorkActivity: (_id: string, _reason?: string) => of({ errorMessage: '' }),
};
const dialogRefMock = { close: jasmine.createSpy('close') };
const snackBarMock = { open: jasmine.createSpy('open') };
const routerMock = { navigate: jasmine.createSpy('navigate') };

describe('DeleteActivityDialogComponent', () => {
  let component: DeleteActivityDialogComponent;
  let fixture: ComponentFixture<DeleteActivityDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeleteActivityDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { roadWorkActivityUuid: 'abc-123' } },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: Router, useValue: routerMock },
        // >>> hier den echten Service-Token mocken, damit KEIN HttpClient gebraucht wird
        { provide: RoadWorkActivityService, useValue: roadWorkActivityServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA], // ignoriert unbekannte Tags/Attribute im Template
    })
      // Template leeren, damit keine Material/FormControls aufgelöst werden müssen
      .overrideTemplate(DeleteActivityDialogComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeleteActivityDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('closeDialog() should close dialog', () => {
    component.closeDialog();
    expect(dialogRefMock.close).toHaveBeenCalled();
  });

  it('deleteRoadworkActivity() should call service, close, navigate and show snackbar', () => {
    component.deleteRoadworkActivity();
    expect(dialogRefMock.close).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/activities/']);
    expect(snackBarMock.open).toHaveBeenCalledWith('Bauvorhaben wurde gelöscht', '', { duration: 4000 });
  });
});
