import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectNameFilterComponent } from './project-name-filter.component';

describe('ProjectNameFilterComponent', () => {
  let component: ProjectNameFilterComponent;
  let fixture: ComponentFixture<ProjectNameFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProjectNameFilterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectNameFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
