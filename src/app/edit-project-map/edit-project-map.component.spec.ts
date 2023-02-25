import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditProjectMapComponent } from './edit-project-map.component';

describe('EditProjectMapComponent', () => {
  let component: EditProjectMapComponent;
  let fixture: ComponentFixture<EditProjectMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditProjectMapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditProjectMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
