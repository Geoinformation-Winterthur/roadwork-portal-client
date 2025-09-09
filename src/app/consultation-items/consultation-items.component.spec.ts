import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsultationItemsComponent } from './consultation-items.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';

// --- Mocks ---
const snackBarMock = { open: jasmine.createSpy('open') };

const userServiceMock = {
  getLocalUser: () => ({ uuid: 'u-1', chosenRole: 'administrator', mailAddress: 'edgar.butwilowski@win.ch' }),
  getUserFromDB: (_: string) => of([{ uuid: 'u-1', errorMessage: '' }])
};

const roadWorkNeedServiceMock = {
  updateRoadWorkNeed: (_: any) => of({ errorMessage: '' }),
  // Liefere eine leere Liste zurück, damit _rebuildLists() sauber durchläuft
  getRoadWorkNeeds: () => of([])
};

const needsOfActivityServiceMock = {
  updateIntersectingRoadWorkNeeds: jasmine.createSpy('updateIntersectingRoadWorkNeeds')
};

describe('ConsultationItemsComponent', () => {
  let component: ConsultationItemsComponent;
  let fixture: ComponentFixture<ConsultationItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        HttpClientTestingModule // optional, aber unschädlich
      ],
      declarations: [ConsultationItemsComponent],
      providers: [
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: RoadWorkNeedService, useValue: roadWorkNeedServiceMock },
        { provide: NeedsOfActivityService, useValue: needsOfActivityServiceMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConsultationItemsComponent);
    component = fixture.componentInstance;

    // Optional: ein simples Input setzen
    component.roadWorkActivity = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] } as any,
      properties: {
        uuid: 'act-1',
        involvedUsers: [],
      } as any
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
