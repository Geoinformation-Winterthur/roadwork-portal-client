import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteNeedDialogComponent } from './delete-need-dialog.component';

describe('DeleteNeedDialogComponent', () => {
  let component: DeleteNeedDialogComponent;
  let fixture: ComponentFixture<DeleteNeedDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeleteNeedDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeleteNeedDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
