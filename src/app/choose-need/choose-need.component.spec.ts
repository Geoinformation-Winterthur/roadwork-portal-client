import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooseNeedComponent } from './choose-need.component';

describe('ChooseNeedComponent', () => {
  let component: ChooseNeedComponent;
  let fixture: ComponentFixture<ChooseNeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChooseNeedComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChooseNeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
