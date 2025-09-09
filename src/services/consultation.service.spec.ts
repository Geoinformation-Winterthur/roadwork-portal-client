import { TestBed } from '@angular/core/testing';

import { ConsultationService } from './consultation.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ConsultationService', () => {
  let service: ConsultationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ConsultationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
