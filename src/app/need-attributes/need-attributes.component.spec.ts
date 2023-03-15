import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NeedAttributesComponent } from './need-attributes.component';

describe('NeedAttributesComponent', () => {
  let component: NeedAttributesComponent;
  let fixture: ComponentFixture<NeedAttributesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NeedAttributesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NeedAttributesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
