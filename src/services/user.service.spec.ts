/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Vermessungsamt Winterthur. All rights reserved.
 */
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { JwtModule } from '@auth0/angular-jwt';
import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { RouterTestingModule } from '@angular/router/testing';
import { TestingHelper } from 'src/helper/testing-helper';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ // only modules go here
        HttpClientTestingModule, JwtModule.forRoot({
        config: {
          tokenGetter: TestingHelper.getToken
        }
      }), RouterTestingModule ], 
      providers: [ ]
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
