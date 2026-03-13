import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';

import { AnalyzesComponent } from './analyzes.component';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';

// --- sehr einfache Mocks ---
const roadWorkNeedServiceMock = {
  downloadRoadWorkNeeds: () => of('id;name\n'),
};

const roadWorkActivityServiceMock = {
  // aktuell im Test nicht genutzt – Platzhalter genügt
};

describe('AnalyzesComponent', () => {
  let component: AnalyzesComponent;
  let fixture: ComponentFixture<AnalyzesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalyzesComponent],
      providers: [
        { provide: RoadWorkNeedService, useValue: roadWorkNeedServiceMock },
        { provide: RoadWorkActivityService, useValue: roadWorkActivityServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA], // ignoriert unbekannte Tags im Template
    })
      // Template leeren, damit keine weiteren Module nötig sind
      .overrideTemplate(AnalyzesComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalyzesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ruft ngOnInit()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
