// needs-of-activity.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NeedsOfActivityComponent } from './needs-of-activity.component';

import { MatSnackBar } from '@angular/material/snack-bar';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { UserService } from 'src/services/user.service';

// ---- sehr einfache Mocks ----
const snackBarMock = { open: jasmine.createSpy('open') };

const roadWorkNeedServiceMock = {
  getRoadWorkNeeds: () => of([]),
  updateRoadWorkNeed: (_: any) => of({ errorMessage: '' }),
  deleteRoadWorkNeed: (_: any, __?: any) => of({ errorMessage: '' }),
};

const needsOfActivityServiceMock = {
  assignedRoadWorkNeeds: [],
  registeredRoadWorkNeeds: [],
  nonAssignedRoadWorkNeeds: [],
  updateIntersectingRoadWorkNeeds: (_uuid: string, _all: any[] = []) => {},
};

const userServiceMock = {
  getLocalUser: () => ({ chosenRole: 'administrator' }),
};

describe('NeedsOfActivityComponent', () => {
  let component: NeedsOfActivityComponent;
  let fixture: ComponentFixture<NeedsOfActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NeedsOfActivityComponent],
      providers: [
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: RoadWorkNeedService, useValue: roadWorkNeedServiceMock },
        { provide: NeedsOfActivityService, useValue: needsOfActivityServiceMock },
        { provide: UserService, useValue: userServiceMock },
      ],
    })
      // Template leeren → keine Material/Forms-Abhängigkeiten im Test
      .overrideTemplate(NeedsOfActivityComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NeedsOfActivityComponent);
    component = fixture.componentInstance;

    // Minimale Inputs
    component.roadWorkActivity = { properties: { uuid: 'test-uuid' } } as any;
    component.isInEditingMode = false;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
