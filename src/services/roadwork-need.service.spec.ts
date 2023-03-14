/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Vermessungsamt Winterthur. All rights reserved.
 */
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { RoadWorkNeedService } from './roadwork-need.service';

describe('RoadWorkNeedService', () => {
  let service: RoadWorkNeedService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ // only modules go here
        RouterTestingModule, HttpClientTestingModule ]
    });
    service = TestBed.inject(RoadWorkNeedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
