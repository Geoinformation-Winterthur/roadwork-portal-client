/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 */
import { TestBed } from '@angular/core/testing';
import { ManagementAreaService } from './management-area.service';

describe('ManagementAreaService', () => {
  let service: ManagementAreaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManagementAreaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
