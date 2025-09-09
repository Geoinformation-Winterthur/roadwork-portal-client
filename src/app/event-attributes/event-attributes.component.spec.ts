import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EventAttributesComponent } from './event-attributes.component';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

// echte Klassentokens der Services:
import { EventService } from 'src/services/event.service';
import { UserService } from 'src/services/user.service';

import { of } from 'rxjs';

// --- sehr einfache Mocks ---
const activatedRouteMock = { params: of({ id: 'new' }) }; // simuliert /events/new
const eventServiceMock = {
  getEvents: (_: string) => of([]),
  addEvent: (e: any) => of({ ...e, errorMessage: '' }),
  updateEvent: (e: any) => of({ ...e, errorMessage: '' }),
};
const userServiceMock = {};
const snackBarMock = { open: jasmine.createSpy('open') };

describe('EventAttributesComponent', () => {
  let component: EventAttributesComponent;
  let fixture: ComponentFixture<EventAttributesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventAttributesComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: EventService, useValue: eventServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
      // Falls doch mal unbekannte Selektoren/Attribute im Template wären
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Template leeren -> keine Forms/Material/ValueAccessor-Abhängigkeiten
      .overrideTemplate(EventAttributesComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EventAttributesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggert ngOnInit(), nutzt aber unser leeres Template
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
