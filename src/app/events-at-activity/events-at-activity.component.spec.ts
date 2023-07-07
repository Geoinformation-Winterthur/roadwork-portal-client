import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventsAtActivityComponent } from './events-at-activity.component';

describe('EventsAtActivityComponent', () => {
  let component: EventsAtActivityComponent;
  let fixture: ComponentFixture<EventsAtActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EventsAtActivityComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EventsAtActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
