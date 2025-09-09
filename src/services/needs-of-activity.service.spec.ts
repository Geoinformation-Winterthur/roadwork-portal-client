import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { NeedsOfActivityService } from './needs-of-activity.service';
import { RoadWorkNeedService } from './roadwork-need.service';

describe('NeedsOfActivityService', () => {
  let service: NeedsOfActivityService;

  // Minimaler Mock – keine HttpClient-Abhängigkeit
  const roadWorkNeedServiceMock = {
    getIntersectingRoadWorkNeeds: (_: string) => of([]),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NeedsOfActivityService,
        { provide: RoadWorkNeedService, useValue: roadWorkNeedServiceMock },
      ],
    });

    service = TestBed.inject(NeedsOfActivityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
