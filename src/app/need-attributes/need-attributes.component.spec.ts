import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { NeedAttributesComponent } from './need-attributes.component';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';

// Klassen-Tokens aus der App
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { DocumentService } from 'src/services/document.service';
import { ManagementAreaService } from 'src/services/management-area.service';
import { UserService } from 'src/services/user.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

describe('NeedAttributesComponent', () => {
  let component: NeedAttributesComponent;
  let fixture: ComponentFixture<NeedAttributesComponent>;

  // ---- Minimale Stubs ----
  const activatedRouteMock = {
    params: of({ id: 'new' }),   // sorgt dafür, dass keine HTTP-Calls für "bestehend" erfolgen
    queryParams: of({})          // optional leer
  };

  const snackBarMock = { open: jasmine.createSpy('open') };
  const dialogMock = { open: jasmine.createSpy('open') };

  const userServiceMock = {
    getLocalUser: () => ({ mailAddress: 'test@win.ch', chosenRole: 'administrator' }),
    getUserFromDB: (_: string) => of([{ errorMessage: '', mailAddress: 'test@win.ch' }])
  };

  const roadWorkNeedServiceMock = {
    addRoadworkNeed: (_: any) => of({ errorMessage: '' }),
    updateRoadWorkNeed: (_: any) => of({ errorMessage: '' }),
    getRoadWorkNeeds: (_: any[]) => of([]),
    deleteRoadWorkNeed: (_: string) => of({ errorMessage: '' })
  };

  const managementAreaServiceMock = {
    getIntersectingManagementArea: (_: any) => of(null)
  };

  const documentServiceMock = {
    uploadDocument: () => of({ errorMessage: '' }),
    getDocument: () => of(new Blob()),
    deleteDocument: () => of({})
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule  // stellt Router bereit; keine echten Routen nötig
      ],
      declarations: [NeedAttributesComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: MatDialog, useValue: dialogMock },

        { provide: UserService, useValue: userServiceMock },
        { provide: RoadWorkNeedService, useValue: roadWorkNeedServiceMock },
        { provide: ManagementAreaService, useValue: managementAreaServiceMock },
        { provide: DocumentService, useValue: documentServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA] // ignoriert unbekannte Selektoren/Attribute im Template
    })
      // Template leeren ⇒ keine Material-/Forms-/OL-Abhängigkeiten in der spec
      .overrideTemplate(NeedAttributesComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NeedAttributesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggert ngOnInit mit id='new'
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
