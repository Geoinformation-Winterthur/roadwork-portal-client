import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditEventMapComponent } from './edit-event-map.component';

describe('EditEventMapComponent', () => {
  let component: EditEventMapComponent;
  let fixture: ComponentFixture<EditEventMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditEventMapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditEventMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
