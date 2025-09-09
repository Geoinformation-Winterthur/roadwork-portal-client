import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChooseEventsComponent } from './choose-events.component';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventService } from 'src/services/event.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// Mocks
const snackBarMock = { open: jasmine.createSpy('open') };
const eventServiceMock = {
  getEvents: () => of([]),
  deleteEvent: (_: string) => of({ errorMessage: '' })
};

describe('ChooseEventsComponent', () => {
  let component: ChooseEventsComponent;
  let fixture: ComponentFixture<ChooseEventsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,      // <- stellt den Router-Provider bereit
        NoopAnimationsModule
      ],
      declarations: [ChooseEventsComponent],
      providers: [
        { provide: EventService, useValue: eventServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock }
      ],
      schemas: [NO_ERRORS_SCHEMA] // ignoriert Template-Selektoren
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChooseEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();    // triggert ngOnInit -> getAllEvents()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
