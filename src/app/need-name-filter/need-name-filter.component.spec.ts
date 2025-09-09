import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { NeedNameFilterComponent } from './need-name-filter.component';
import { ChooseNeedComponent } from '../choose-need/choose-need.component';

// sehr einfacher Parent-Stub
const chooseNeedStub: any = {
  filterNeedName: '',
  getNeedsWithFilter: jasmine.createSpy('getNeedsWithFilter'),
};

describe('NeedNameFilterComponent', () => {
  let component: NeedNameFilterComponent;
  let fixture: ComponentFixture<NeedNameFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NeedNameFilterComponent],
      providers: [
        { provide: ChooseNeedComponent, useValue: chooseNeedStub },
      ],
      schemas: [NO_ERRORS_SCHEMA], // ignoriert evtl. mat-* im Template
    })
      .overrideTemplate(NeedNameFilterComponent, '') // Template entkoppeln
      .compileComponents();
  });

  beforeEach(() => {
    // Stub zurücksetzen
    chooseNeedStub.filterNeedName = '';
    chooseNeedStub.getNeedsWithFilter.calls?.reset?.();

    fixture = TestBed.createComponent(NeedNameFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set parent.filterNeedName and call parent.getNeedsWithFilter()', () => {
    component.needSearchControl.setValue('abc');
    component.filterNeedName();

    expect(chooseNeedStub.filterNeedName).toBe('abc');
    expect(chooseNeedStub.getNeedsWithFilter).toHaveBeenCalled();
  });
});
