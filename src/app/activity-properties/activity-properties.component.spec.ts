import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityPropertiesComponent } from './activity-properties.component';

describe('ActivityPropertiesComponent', () => {
  let component: ActivityPropertiesComponent;
  let fixture: ComponentFixture<ActivityPropertiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivityPropertiesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityPropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
