import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { ManagementAreasComponent } from './management-areas.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ManagementAreaService } from 'src/services/management-area.service';
import { UserService } from 'src/services/user.service';

describe('ManagementAreasComponent', () => {
  let component: ManagementAreasComponent;
  let fixture: ComponentFixture<ManagementAreasComponent>;

  // --- einfache Mocks ---
  const snackBarMock = { open: jasmine.createSpy('open') };

  const managementAreaServiceMock = {
    getManagementAreas: () => of({ features: [] }),
    updateManagementArea: (_: any) =>
      of({
        errorMessage: '',
        uuid: 'uuid-1',
        manager: { uuid: 'u1', firstName: 'Max', lastName: 'Muster' },
      }),
  };

  const userServiceMock = {
    getAllTerritoryManagers: () => of([]),
    hasUserAccess: () => true,                // <- wichtig: vom Template aufgerufen
    isUserLoggedIn: () => true,               // <- falls im Template verwendet
    getLocalUser: () => ({ uuid: 'u1', chosenRole: 'administrator' }), // <- defensiv
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ManagementAreasComponent],
      providers: [
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: ManagementAreaService, useValue: managementAreaServiceMock },
        { provide: UserService, useValue: userServiceMock },
      ],
      // Ignoriere unbekannte Elemente/Attribute (mat-*, ol-*, etc.)
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManagementAreasComponent);
    component = fixture.componentInstance;

    // OpenLayers-Initialisierung im Test unterbinden
    spyOn(component as any, 'initializeMap').and.stub();

    fixture.detectChanges(); // triggert ngOnInit + (gestubbt) ngAfterViewInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
