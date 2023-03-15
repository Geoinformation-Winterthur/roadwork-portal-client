import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NeedNameFilterComponent } from './need-name-filter.component';

describe('NeedNameFilterComponent', () => {
  let component: NeedNameFilterComponent;
  let fixture: ComponentFixture<NeedNameFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NeedNameFilterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NeedNameFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
