import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityJournalComponent } from './activity-journal.component';

describe('ActivityJournalComponent', () => {
  let component: ActivityJournalComponent;
  let fixture: ComponentFixture<ActivityJournalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivityJournalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityJournalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
