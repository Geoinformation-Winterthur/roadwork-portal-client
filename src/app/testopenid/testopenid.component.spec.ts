import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestopenidComponent } from './testopenid.component';
import { OAuthService } from 'angular-oauth2-oidc';
import { UserService } from 'src/services/user.service';

const oauthServiceMock = {
  configure: jasmine.createSpy('configure'),
  tokenValidationHandler: {} as any,
  loadDiscoveryDocumentAndTryLogin: jasmine.createSpy('loadDiscoveryDocumentAndTryLogin')
    .and.returnValue(Promise.resolve()),
  getIdToken: jasmine.createSpy('getIdToken').and.returnValue(null),
  logOut: jasmine.createSpy('logOut'),
  initLoginFlow: jasmine.createSpy('initLoginFlow'),
  getIdentityClaims: jasmine.createSpy('getIdentityClaims').and.returnValue({})
};

const userServiceMock = {
  loginWithOpenId: jasmine.createSpy('loginWithOpenId')
};

describe('TestopenidComponent', () => {
  let component: TestopenidComponent;
  let fixture: ComponentFixture<TestopenidComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestopenidComponent],
      providers: [
        { provide: OAuthService, useValue: oauthServiceMock },
        { provide: UserService, useValue: userServiceMock },
      ]
    })
      // optional – verhindert Getter/Template-Nebenwirkungen im Test:
      .overrideTemplate(TestopenidComponent, '')
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
