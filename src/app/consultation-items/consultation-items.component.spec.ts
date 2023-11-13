import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultationItemsComponent } from './consultation-items.component';

describe('ConsultationItemsComponent', () => {
  let component: ConsultationItemsComponent;
  let fixture: ComponentFixture<ConsultationItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConsultationItemsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConsultationItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
