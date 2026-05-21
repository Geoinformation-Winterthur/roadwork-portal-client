import { TestBed } from '@angular/core/testing';

import { JournalEntryService } from './journal-entry.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('JournalEntryService', () => {
  let service: JournalEntryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(JournalEntryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});