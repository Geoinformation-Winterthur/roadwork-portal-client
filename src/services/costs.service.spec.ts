import { TestBed } from '@angular/core/testing';

import { CostsService } from './costs.service';

describe('CostsService', () => {
  let service: CostsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CostsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
