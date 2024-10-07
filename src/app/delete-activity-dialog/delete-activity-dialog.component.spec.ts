import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteActivityDialogComponent } from './delete-activity-dialog.component';

describe('DeleteActivityDialogComponent', () => {
  let component: DeleteActivityDialogComponent;
  let fixture: ComponentFixture<DeleteActivityDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeleteActivityDialogComponent ]
    })
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
});
