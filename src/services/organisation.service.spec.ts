import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { OrganisationService } from './organisation.service';
import { environment } from 'src/environments/environment';
import { OrganisationalUnit } from 'src/model/organisational-unit';
import { ErrorMessage } from 'src/model/error-message';

describe('OrganisationService', () => {
  let service: OrganisationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrganisationService],
    });

    service = TestBed.inject(OrganisationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // stellt sicher, dass keine offenen HTTP-Requests übrig sind
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAllOrgTypes(false) -> GET /account/organisations/', () => {
    const url = `${environment.apiUrl}/account/organisations/`;
    let resp: OrganisationalUnit[] | undefined;

    service.getAllOrgTypes(false).subscribe(r => (resp = r));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');

    const mock: OrganisationalUnit[] = [];
    req.flush(mock);
    expect(resp).toEqual(mock);
  });

  it('getAllOrgTypes(true) -> GET /account/organisations/?withcontactperson=true', () => {
    const url = `${environment.apiUrl}/account/organisations/?withcontactperson=true`;
    let resp: OrganisationalUnit[] | undefined;

    service.getAllOrgTypes(true).subscribe(r => (resp = r));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('GET');

    const mock: OrganisationalUnit[] = [{ uuid: '1', name: 'Werk A' } as any];
    req.flush(mock);
    expect(resp).toEqual(mock);
  });

  it('addOrganisation -> POST /account/organisations/', () => {
    const url = `${environment.apiUrl}/account/organisations/`;
    const org = { uuid: '1', name: 'Werk A' } as OrganisationalUnit;

    let resp: any;
    service.addOrganisation(org).subscribe(r => (resp = r));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(org);

    const mockResponse = { ok: true };
    req.flush(mockResponse);
    expect(resp).toEqual(mockResponse);
  });

  it('updateOrganisation -> PUT /account/organisations/', () => {
    const url = `${environment.apiUrl}/account/organisations/`;
    const org = { uuid: '1', name: 'Werk A' } as OrganisationalUnit;

    let resp: ErrorMessage | undefined;
    service.updateOrganisation(org).subscribe(r => (resp = r));

    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(org);

    const mock: ErrorMessage = { errorMessage: '' };
    req.flush(mock);
    expect(resp).toEqual(mock);
  });
});
