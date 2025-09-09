import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { EventsAtActivityComponent } from './events-at-activity.component';
import { EventService } from 'src/services/event.service';
import { MatSnackBar } from '@angular/material/snack-bar';

// --- sehr einfache Mocks ---
const eventServiceMock = {
  getEvents: (_a?: any, _b?: any, _c?: any, _d?: any, _e?: any) => of([])
};
const snackBarMock = { open: jasmine.createSpy('open') };

describe('EventsAtActivityComponent', () => {
  let component: EventsAtActivityComponent;
  let fixture: ComponentFixture<EventsAtActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventsAtActivityComponent],
      providers: [
        { provide: EventService, useValue: eventServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
      // falls doch unbekannte Selektoren/Attribute im (leeren) Template wären
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Template leeren -> keine Material-/Forms-Abhängigkeiten
      .overrideTemplate(EventsAtActivityComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EventsAtActivityComponent);
    component = fixture.componentInstance;
    // roadWorkActivityUuid absichtlich NICHT setzen -> ngOnInit ruft keine Services
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
