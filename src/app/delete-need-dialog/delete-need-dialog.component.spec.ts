import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteNeedDialogComponent } from './delete-need-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';

describe('DeleteNeedDialogComponent', () => {
  let component: DeleteNeedDialogComponent;
  let fixture: ComponentFixture<DeleteNeedDialogComponent>;

  const dialogRefMock = { close: jasmine.createSpy('close') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeleteNeedDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock } // <-- Mock bereitstellen
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeleteNeedDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on closeDeleteDialog()', () => {
    component.closeDeleteDialog();
    expect(dialogRefMock.close).toHaveBeenCalled();
  });
});
