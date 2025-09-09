import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityNameFilterComponent } from './activity-name-filter.component';
import { ChooseActivityComponent } from '../choose-activity/choose-activity.component';

describe('ActivityNameFilterComponent', () => {
  let component: ActivityNameFilterComponent;
  let fixture: ComponentFixture<ActivityNameFilterComponent>;

  // Minimaler Parent-Stub
  const chooseActivityStub = {
    chosenActivityName: '',
    filterActivities: jasmine.createSpy('filterActivities'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ActivityNameFilterComponent],
      providers: [
        { provide: ChooseActivityComponent, useValue: chooseActivityStub },
      ],
    })
      // Template leeren, damit keine Material-/Autocomplete-Abhängigkeiten greifen
      .overrideTemplate(ActivityNameFilterComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityNameFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ruft ngOnInit auf
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
