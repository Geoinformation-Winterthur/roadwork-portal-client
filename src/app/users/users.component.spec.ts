import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsersComponent } from './users.component';
import { of } from 'rxjs';
import { UserService } from '../../services/user.service';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;

  // einfacher Mock
  const userServiceMock = {
    getAllUsers: () => of([]),
    deleteUser: (_: string) => of(void 0)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UsersComponent],
      providers: [{ provide: UserService, useValue: userServiceMock }]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggert ngOnInit -> getAllUsers()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
