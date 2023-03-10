import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagementAreasComponent } from './management-areas.component';

describe('ManagementAreasComponent', () => {
  let component: ManagementAreasComponent;
  let fixture: ComponentFixture<ManagementAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManagementAreasComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManagementAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
