import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityCostsComponent } from './activity-costs.component';

describe('ActivityCostsComponent', () => {
  let component: ActivityCostsComponent;
  let fixture: ComponentFixture<ActivityCostsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivityCostsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityCostsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
