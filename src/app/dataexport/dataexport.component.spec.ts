import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataexportComponent } from './dataexport.component';

describe('DataexportComponent', () => {
  let component: DataexportComponent;
  let fixture: ComponentFixture<DataexportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataexportComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DataexportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
