import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { NeedYearFilterComponent } from './need-year-filter.component';
import { ChooseNeedComponent } from '../choose-need/choose-need.component';

// Minimaler Stub für den Parent (per Konstruktor injiziert)
const chooseNeedStub = {
  getNeedsWithFilter: jasmine.createSpy('getNeedsWithFilter'),
};

describe('NeedYearFilterComponent', () => {
  let component: NeedYearFilterComponent;
  let fixture: ComponentFixture<NeedYearFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NeedYearFilterComponent],
      providers: [
        { provide: ChooseNeedComponent, useValue: chooseNeedStub },
      ],
      schemas: [NO_ERRORS_SCHEMA], // ignoriert evtl. unbekannte Template-Tags
    })
      .overrideTemplate(NeedYearFilterComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NeedYearFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Minimaler Check: Methode ruft Parent-Funktion
  it('should call parent.getNeedsWithFilter on filterYears()', () => {
    chooseNeedStub.getNeedsWithFilter.calls.reset();
    component.filterYears();
    expect(chooseNeedStub.getNeedsWithFilter).toHaveBeenCalled();
  });
});
