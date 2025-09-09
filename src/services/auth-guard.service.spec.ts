import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

import { AuthGuardService } from './auth-guard.service';
import { UserService } from './user.service';

describe('AuthGuardService', () => {
  let guard: AuthGuardService;

  // einfache Mocks
  const routerMock = {
    navigate: jasmine.createSpy('navigate'),
  };

  // wir wollen den Rückgabewert umschalten können
  const userServiceMock: { isUserLoggedIn: () => boolean } = {
    isUserLoggedIn: () => false,
  };

  // Hilfs-Snapshots
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/geheim' } as RouterStateSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthGuardService,
        { provide: Router, useValue: routerMock },
        { provide: UserService, useValue: userServiceMock },
      ],
    });

    guard = TestBed.inject(AuthGuardService);
    routerMock.navigate.calls.reset();
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow activation when user is logged in', () => {
    // logged in
    userServiceMock.isUserLoggedIn = () => true;

    const result = guard.canActivate(route, state);
    expect(result).toBeTrue();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should block and redirect to login when user is not logged in', () => {
    // logged out
    userServiceMock.isUserLoggedIn = () => false;

    const result = guard.canActivate(route, state);
    expect(result).toBeFalse();
    expect(routerMock.navigate).toHaveBeenCalledWith(
      ['login'],
      { queryParams: { returnUrl: state.url } }
    );
  });
});
