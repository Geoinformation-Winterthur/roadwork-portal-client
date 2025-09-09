import { TestBed } from '@angular/core/testing';

import { AppConfigService } from './app-config.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AppConfigService', () => {
  let service: AppConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(AppConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
