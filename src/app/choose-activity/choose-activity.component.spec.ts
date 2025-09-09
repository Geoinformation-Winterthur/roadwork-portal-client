// choose-activity.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { ChooseActivityComponent } from './choose-activity.component';
import { MatSnackBar } from '@angular/material/snack-bar';

import { UserService } from 'src/services/user.service';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { ManagementAreaService } from 'src/services/management-area.service';

// ---- sehr einfache Mocks ----
const snackBarMock = { open: jasmine.createSpy('open') };

const userServiceMock = {
  getLocalUser: () => ({ mailAddress: 'test@win.ch' }),
  getUserFromDB: (_: string) => of([{ errorMessage: '' }]),
  hasUserAccess: () => true, // <- wichtig, verhindert Template-Fehler
};

const roadWorkActivityServiceMock = {
  getRoadWorkActivities: () => of([]),
};

const managementAreaServiceMock = {
  getIntersectingManagementArea: (_: any) => of(null),
};

describe('ChooseActivityComponent', () => {
  let component: ChooseActivityComponent;
  let fixture: ComponentFixture<ChooseActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChooseActivityComponent],
      providers: [
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: RoadWorkActivityService, useValue: roadWorkActivityServiceMock },
        { provide: ManagementAreaService, useValue: managementAreaServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA], // ignoriert unbekannte Tags/Attrs
    })
      // Template leeren -> keinerlei Template-Abhängigkeiten/Calls
      .overrideTemplate(ChooseActivityComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChooseActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggert ngOnInit()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
