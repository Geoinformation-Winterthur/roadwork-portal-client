import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { SessionsComponent } from './sessions.component';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { UserService } from 'src/services/user.service';
import { ReportLoaderService } from 'src/services/report-loader.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('SessionsComponent', () => {
  let component: SessionsComponent;
  let fixture: ComponentFixture<SessionsComponent>;

  // --- einfache Mocks (keine HttpClient-Abhängigkeiten) ---
  const roadWorkActivityServiceMock = {
    getRoadWorkActivities: () =>
      of([
        {
          properties: {
            uuid: 'act-1',
            dateSks: '2025-03-15',
            areaManager: { firstName: 'Alex' },
            created: new Date('2025-01-10'),
            type: 'Strasse',
            section: 'Abschnitt A',
            name: 'Projekt A',
          },
        },
      ]),
  };

  const userServiceMock = {
    getLocalUser: () => ({ mailAddress: 'tester@example.com' }),
    getUserFromDB: (_: string) => of([{ errorMessage: '' }]),
    getAllUsers: () =>
      of([
        {
          firstName: 'Max',
          lastName: 'Muster',
          organisationalUnit: { abbreviation: 'TB' },
          mailAddress: 'max.muster@example.com',
        },
        {
          firstName: 'Erika',
          lastName: 'Muster',
          organisationalUnit: { abbreviation: 'WB' },
          mailAddress: 'erika.muster@example.com',
        },
      ]),
  };

  const reportLoaderServiceMock = {
    generateReport: async (
      _template: string,
      _type: string,
      _children: any[],
      _id: string
    ) => '<div>report</div>',
  };

  const snackBarMock = { open: jasmine.createSpy('open') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SessionsComponent],
      providers: [
        { provide: RoadWorkActivityService, useValue: roadWorkActivityServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: ReportLoaderService, useValue: reportLoaderServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
      // ignoriert unbekannte Tags wie <ag-grid-angular> u.ä.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggert ngOnInit() und Subscriptions
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
