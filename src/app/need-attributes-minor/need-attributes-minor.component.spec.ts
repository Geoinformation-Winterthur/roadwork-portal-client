import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NeedAttributesMinorComponent } from './need-attributes-minor.component';

describe('NeedAttributesMinorComponent', () => {
  let component: NeedAttributesMinorComponent;
  let fixture: ComponentFixture<NeedAttributesMinorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NeedAttributesMinorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NeedAttributesMinorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
