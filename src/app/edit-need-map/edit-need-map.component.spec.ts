import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditNeedMapComponent } from './edit-need-map.component';
import { MatSnackBar } from '@angular/material/snack-bar';

// echte Klassentokens der Services:
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { ManagementAreaService } from 'src/services/management-area.service';
import { AddressService } from 'src/services/address.service';

// --- sehr einfache Mocks, da wir nur "should create" wollen ---
const snackBarMock = { open: jasmine.createSpy('open') };
const roadWorkNeedServiceMock = {};
const managementAreaServiceMock = {};
const addressServiceMock = {};

describe('EditNeedMapComponent', () => {
  let component: EditNeedMapComponent;
  let fixture: ComponentFixture<EditNeedMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditNeedMapComponent],
      providers: [
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: RoadWorkNeedService, useValue: roadWorkNeedServiceMock },
        { provide: ManagementAreaService, useValue: managementAreaServiceMock },
        { provide: AddressService, useValue: addressServiceMock },
      ],
      // ignoriert unbekannte Tags/Attribute (falls welche im Template wären)
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Template leeren -> keine DOM-Elemente oder Material-Directives nötig
      .overrideTemplate(EditNeedMapComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditNeedMapComponent);
    component = fixture.componentInstance;

    // Verhindert OpenLayers/Proj-Setup und Map-Initialisierung im Test
    spyOn(component as any, 'ngAfterViewInit').and.stub();

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
