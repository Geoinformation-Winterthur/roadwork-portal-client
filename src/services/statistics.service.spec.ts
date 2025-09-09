import { TestBed } from '@angular/core/testing';

import { StatisticsService } from './statistics.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StatisticsService', () => {
  let service: StatisticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(StatisticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
