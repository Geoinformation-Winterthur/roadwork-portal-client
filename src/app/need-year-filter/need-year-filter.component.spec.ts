import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NeedYearFilterComponent } from './need-year-filter.component';

describe('NeedYearFilterComponent', () => {
  let component: NeedYearFilterComponent;
  let fixture: ComponentFixture<NeedYearFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NeedYearFilterComponent ]
    })
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
});
