import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectAttributesComponent } from './project-attributes.component';

describe('ProjectAttributesComponent', () => {
  let component: ProjectAttributesComponent;
  let fixture: ComponentFixture<ProjectAttributesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProjectAttributesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectAttributesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
