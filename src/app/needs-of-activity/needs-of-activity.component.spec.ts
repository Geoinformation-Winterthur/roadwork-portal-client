import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NeedsOfActivityComponent } from './needs-of-activity.component';

describe('NeedsOfActivityComponent', () => {
  let component: NeedsOfActivityComponent;
  let fixture: ComponentFixture<NeedsOfActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NeedsOfActivityComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NeedsOfActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
