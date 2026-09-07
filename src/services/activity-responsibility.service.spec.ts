import { TestBed } from '@angular/core/testing';

import { ActivityResponsibilityService } from './activity-responsibility.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ActivityResponsibilityService', () => {
  let service: ActivityResponsibilityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ActivityResponsibilityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});