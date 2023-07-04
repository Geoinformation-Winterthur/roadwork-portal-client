import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityYearFilterComponent } from './activity-year-filter.component';

describe('ActivityYearFilterComponent', () => {
  let component: ActivityYearFilterComponent;
  let fixture: ComponentFixture<ActivityYearFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivityYearFilterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityYearFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
