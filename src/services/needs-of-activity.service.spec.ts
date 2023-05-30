import { TestBed } from '@angular/core/testing';

import { NeedsOfActivityService } from './needs-of-activity.service';

describe('NeedsOfActivityService', () => {
  let service: NeedsOfActivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NeedsOfActivityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
