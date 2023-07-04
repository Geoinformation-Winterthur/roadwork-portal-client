import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventAttributesComponent } from './event-attributes.component';

describe('EventAttributesComponent', () => {
  let component: EventAttributesComponent;
  let fixture: ComponentFixture<EventAttributesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EventAttributesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EventAttributesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
