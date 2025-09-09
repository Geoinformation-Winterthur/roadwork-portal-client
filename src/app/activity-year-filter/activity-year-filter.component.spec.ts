import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityYearFilterComponent } from './activity-year-filter.component';
import { ChooseActivityComponent } from '../choose-activity/choose-activity.component';

describe('ActivityYearFilterComponent', () => {
  let component: ActivityYearFilterComponent;
  let fixture: ComponentFixture<ActivityYearFilterComponent>;

  // Minimaler Parent-Mock mit nur der verwendeten Methode
  const chooseActivityMock = {
    filterActivities: jasmine.createSpy('filterActivities'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ActivityYearFilterComponent],
      providers: [
        { provide: ChooseActivityComponent, useValue: chooseActivityMock },
      ],
    })
      // Template leeren, um jegliche Template-Abhängigkeiten zu vermeiden
      .overrideTemplate(ActivityYearFilterComponent, '')
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
