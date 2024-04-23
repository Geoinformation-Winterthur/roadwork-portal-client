import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportingItemsComponent } from './reporting-items.component';

describe('ReportingItemsComponent', () => {
  let component: ReportingItemsComponent;
  let fixture: ComponentFixture<ReportingItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportingItemsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportingItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
