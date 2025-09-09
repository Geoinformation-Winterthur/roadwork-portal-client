import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrganisationsComponent } from './organisations.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrganisationService } from 'src/services/organisation.service';

describe('OrganisationsComponent', () => {
  let component: OrganisationsComponent;
  let fixture: ComponentFixture<OrganisationsComponent>;

  // einfache Mocks
  const snackBarMock = { open: jasmine.createSpy('open') };
  const organisationServiceMock = {
    getAllOrgTypes: () => of([]),
    addOrganisation: (_: any) => of({ errorMessage: '' }),
    updateOrganisation: (_: any) => of({ errorMessage: '' }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OrganisationsComponent],
      providers: [
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: OrganisationService, useValue: organisationServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OrganisationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggert ngOnInit -> nutzt getAllOrgTypes()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
