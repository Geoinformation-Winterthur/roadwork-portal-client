import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityDatesComponent } from './activity-dates.component';

describe('ActivityDatesComponent', () => {
  let component: ActivityDatesComponent;
  let fixture: ComponentFixture<ActivityDatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivityDatesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityDatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
