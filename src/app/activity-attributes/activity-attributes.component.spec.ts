/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityAttributesComponent } from './activity-attributes.component';

describe('ActivityAttributesComponent', () => {
  let component: ActivityAttributesComponent;
  let fixture: ComponentFixture<ActivityAttributesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivityAttributesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityAttributesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
