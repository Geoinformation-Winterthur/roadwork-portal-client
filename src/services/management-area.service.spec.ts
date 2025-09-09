import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { ManagementAreaService } from './management-area.service';
import { environment } from 'src/environments/environment';

describe('ManagementAreaService', () => {
  let service: ManagementAreaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ManagementAreaService],
    });
    service = TestBed.inject(ManagementAreaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getManagementAreas() sollte auf /managementarea/ GETten', () => {
    const url = `${environment.apiUrl}/managementarea/`;

    let responded: any;
    service.getManagementAreas().subscribe((res) => (responded = res));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');

    req.flush({ type: 'FeatureCollection', features: [] });
    expect(responded).toEqual({ type: 'FeatureCollection', features: [] });
  });

  it('getIntersectingManagementArea() sollte auf /managementarea/ POSTen', () => {
    const url = `${environment.apiUrl}/managementarea/`;
    const poly = { coordinates: [[[0, 0]]] } as any;

    let responded: any;
    service.getIntersectingManagementArea(poly).subscribe((res) => (responded = res));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(poly);

    req.flush({ manager: { firstName: 'Max', lastName: 'Muster' } });
    expect(responded).toEqual({ manager: { firstName: 'Max', lastName: 'Muster' } });
  });

  it('updateManagementArea() sollte auf /managementarea/ PUTten', () => {
    const url = `${environment.apiUrl}/managementarea/`;
    const area = { uuid: 'ma-1', name: 'MA 1' } as any;

    let responded: any;
    service.updateManagementArea(area).subscribe((res) => (responded = res));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(area);

    req.flush(area);
    expect(responded).toEqual(area);
  });
});
