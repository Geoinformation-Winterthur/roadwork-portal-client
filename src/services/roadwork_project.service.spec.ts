/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Vermessungsamt Winterthur. All rights reserved.
 */
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { RoadWorkProjectService } from './roadwork_project.service';

describe('RoadWorkProjectService', () => {
  let service: RoadWorkProjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ // only modules go here
        RouterTestingModule, HttpClientTestingModule ]
    });
    service = TestBed.inject(RoadWorkProjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
