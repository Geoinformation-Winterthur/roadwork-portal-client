import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { UserComponent } from './user.component';
import { UserService } from 'src/services/user.service';
import { OrganisationService } from 'src/services/organisation.service';
import { ActivatedRoute } from '@angular/router';

// --- einfache Mocks ---
const snackBarMock = { open: jasmine.createSpy('open') };

const userServiceMock = {
  getUserFromDB: (_: string) => of([{ errorMessage: '', organisationalUnit: { name: 'Org' } }]),
  addUser: (_: any) => of({ errorMessage: '' }),
  updateUser: (_: any, _changePw?: boolean) => of({ errorMessage: '' }),
  deleteUser: (_: string) => of({ errorMessage: '' }),
};

const organisationServiceMock = {
  getAllOrgTypes: () => of([]),
};

// ActivatedRoute liefert "new", damit kein echter DB-Call nötig ist
const activatedRouteMock = { params: of({ email: 'new' }) };

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [UserComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: OrganisationService, useValue: organisationServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA], // ignoriert unbekannte Template-Elemente
    })
      // wichtig: Template leeren => keine ngModel/FormControl/Material-Abhängigkeiten
      .overrideTemplate(UserComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggert ngOnInit()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
