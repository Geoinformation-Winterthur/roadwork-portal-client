/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooseActivityComponent } from './choose-activity.component';

describe('ChooseActivityComponent', () => {
  let component: ChooseActivityComponent;
  let fixture: ComponentFixture<ChooseActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChooseActivityComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChooseActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
