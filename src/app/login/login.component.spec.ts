import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { LoginComponent } from './login.component';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { UserService } from 'src/services/user.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  // Minimalste Stubs
  const routerMock = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
  const activatedRouteMock = { snapshot: { queryParams: {} } };
  const userServiceMock = {
    // ruft im Test nie etwas, aber zur Sicherheit bereit
    login: (_user: any, onSuccess: Function, _onError: Function) => onSuccess()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: UserService, useValue: userServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      // Template leeren -> keine Forms-/Material-Abhängigkeiten nötig
      .overrideTemplate(LoginComponent, '')
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
