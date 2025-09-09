import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { DataexportComponent } from './dataexport.component';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';

// --- sehr einfache Mocks ---
const roadWorkNeedServiceMock = {
  downloadRoadWorkNeeds: () => of('id;name\n'),
};

const roadWorkActivityServiceMock = {
  // aktuell im Test nicht genutzt – Platzhalter genügt
};

describe('DataexportComponent', () => {
  let component: DataexportComponent;
  let fixture: ComponentFixture<DataexportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataexportComponent],
      providers: [
        { provide: RoadWorkNeedService, useValue: roadWorkNeedServiceMock },
        { provide: RoadWorkActivityService, useValue: roadWorkActivityServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA], // ignoriert unbekannte Tags im Template
    })
      // Template leeren, damit keine weiteren Module nötig sind
      .overrideTemplate(DataexportComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DataexportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ruft ngOnInit()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
