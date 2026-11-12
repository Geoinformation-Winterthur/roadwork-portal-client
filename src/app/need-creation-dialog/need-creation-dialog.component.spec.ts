import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NeedCreationDialogComponent } from './need-creation-dialog.component';

describe('NeedCreationDialogComponent', () => {
  let component: NeedCreationDialogComponent;
  let fixture: ComponentFixture<NeedCreationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NeedCreationDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NeedCreationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
