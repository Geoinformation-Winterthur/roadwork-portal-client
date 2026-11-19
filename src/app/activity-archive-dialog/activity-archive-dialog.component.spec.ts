import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityArchiveDialogComponent } from './activity-archive-dialog.component';

describe('ActivityArchiveDialogComponent', () => {
  let component: ActivityArchiveDialogComponent;
  let fixture: ComponentFixture<ActivityArchiveDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivityArchiveDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityArchiveDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
