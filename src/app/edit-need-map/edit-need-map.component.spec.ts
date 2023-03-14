import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditNeedMapComponent } from './edit-need-map.component';

describe('EditNeedMapComponent', () => {
  let component: EditNeedMapComponent;
  let fixture: ComponentFixture<EditNeedMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditNeedMapComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditNeedMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
