import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditActivityMapComponent } from './edit-activity-map.component';

describe('EditActivityMapComponent', () => {
  let component: EditActivityMapComponent;
  let fixture: ComponentFixture<EditActivityMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditActivityMapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditActivityMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
