import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityNameFilterComponent } from './activity-name-filter.component';

describe('ActivityNameFilterComponent', () => {
  let component: ActivityNameFilterComponent;
  let fixture: ComponentFixture<ActivityNameFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivityNameFilterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityNameFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
