import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectYearFilterComponent } from './project-year-filter.component';

describe('ProjectYearFilterComponent', () => {
  let component: ProjectYearFilterComponent;
  let fixture: ComponentFixture<ProjectYearFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProjectYearFilterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectYearFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
