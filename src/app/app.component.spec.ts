import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MediaObserver } from '@angular/flex-layout';
import { CookieService } from 'ngx-cookie-service';
import { UserService } from '../services/user.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Title } from '@angular/platform-browser';

// ---- Mocks ----
const snackBarMock = {
  open: jasmine.createSpy('open').and.returnValue({
    afterDismissed: () => of({})   // wird in showCookieNotification verwendet
  })
};
const mediaObserverMock = {
  asObservable: () => of([{ mqAlias: 'lg' }]) // simuliert Desktop-Viewport
};
const cookieServiceMock = {
  get: (_: string) => 'true',                 // Cookie bereits gesetzt -> Snackbar bleibt zu
  set: jasmine.createSpy('set')
};
const userServiceMock = {
  isUserLoggedIn: () => true,
  logout: jasmine.createSpy('logout')
};

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      declarations: [AppComponent],
      providers: [
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: MediaObserver, useValue: mediaObserverMock },
        { provide: CookieService, useValue: cookieServiceMock },
        { provide: UserService, useValue: userServiceMock },
        Title
      ],
      schemas: [NO_ERRORS_SCHEMA] // ignoriert allfällige unbekannte Template-Directives
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have a title from environment`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(typeof app.title).toBe('string');
  });
});
