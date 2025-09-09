import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { WelcomeComponent } from './welcome.component';
import { UserService } from 'src/services/user.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { ManagementAreaService } from 'src/services/management-area.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('WelcomeComponent', () => {
  let component: WelcomeComponent;
  let fixture: ComponentFixture<WelcomeComponent>;

  // --- einfache Mocks ohne HttpClient/JWT-Abhängigkeiten ---
  const snackBarMock = { open: jasmine.createSpy('open') };

  const userServiceMock = {
    isUserLoggedIn: () => true,
    getLocalUser: () => ({
      uuid: 'user-1',
      mailAddress: 'tester@example.com',
      chosenRole: 'administrator'
    }),
    getUserFromDB: (_: string) =>
      of([
        {
          uuid: 'user-1',
          firstName: 'Test',
          lastName: 'User',
          chosenRole: 'administrator',
          errorMessage: ''
        }
      ]),
    updateUser: (_user: any, _changePw?: boolean) =>
      of({ errorMessage: '' }),
  };

  const roadWorkNeedServiceMock = {
    // im Component werden ohne Argumente alle Needs geholt
    getRoadWorkNeeds: (_uuids?: string[]) => of([]),
  };

  const roadWorkActivityServiceMock = {
    // im Component wird mit Status-Filter geholt
    getRoadWorkActivities: (_filterText?: string, _statusCsv?: string) => of([]),
  };

  const managementAreaServiceMock = {
    getIntersectingManagementArea: (_geom: any) => of(null),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WelcomeComponent],
      providers: [
        { provide: UserService, useValue: userServiceMock },
        { provide: RoadWorkNeedService, useValue: roadWorkNeedServiceMock },
        { provide: RoadWorkActivityService, useValue: roadWorkActivityServiceMock },
        { provide: ManagementAreaService, useValue: managementAreaServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
      // Ignoriert Material/AG-Grid/sonstige unbekannte Tags & Inputs
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WelcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggert ngOnInit()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
