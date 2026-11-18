import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NeedAssignDialogComponent } from './need-assign-dialog.component';

describe('NeedAssignDialogComponent', () => {
  let component: NeedAssignDialogComponent;
  let fixture: ComponentFixture<NeedAssignDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NeedAssignDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NeedAssignDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
