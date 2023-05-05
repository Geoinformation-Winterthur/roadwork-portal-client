import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestopenidComponent } from './testopenid.component';

describe('TestopenidComponent', () => {
  let component: TestopenidComponent;
  let fixture: ComponentFixture<TestopenidComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TestopenidComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestopenidComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
