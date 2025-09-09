import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { DocumentService } from './document.service';
import { environment } from 'src/environments/environment';

describe('DocumentService', () => {
  let service: DocumentService;
  let httpMock: HttpTestingController;

  const uuid = 'need-123';
  const docUuid = 'doc-456';
  const type = 'roadworkneed';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DocumentService],
    });
    service = TestBed.inject(DocumentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getDocument() sollte PDF als Blob holen', () => {
    const expectedUrl =
      `${environment.apiUrl}/${type}/${uuid}/pdf/?docuuid=${docUuid}`;

    let actualBlob: Blob | undefined;

    service.getDocument(uuid, docUuid, type).subscribe((blob) => {
      actualBlob = blob;
      expect(blob instanceof Blob).toBeTrue();
    });

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.headers.get('Accept')).toBe('application/pdf');

    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    expect(actualBlob).toBeTruthy();
  });

  it('uploadDocument() sollte FormData posten', () => {
    const expectedUrl = `${environment.apiUrl}/${type}/${uuid}/pdf/`;
    const fd = new FormData();
    fd.append('pdfFile', new Blob(['x'], { type: 'application/pdf' }), 'foo.pdf');

    let responded: any;
    service.uploadDocument(uuid, fd, type).subscribe((res) => (responded = res));

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('POST');
    // Browser setzt Content-Type + Boundary selbst; kein manuelles Setzen nötig
    expect(req.request.body instanceof FormData).toBeTrue();

    req.flush({ errorMessage: '' });
    expect(responded).toEqual({ errorMessage: '' });
  });

  it('deleteDocument() sollte DELETE aufrufen', () => {
    const expectedUrl =
      `${environment.apiUrl}/${type}/${uuid}/pdf/?docuuid=${docUuid}`;

    let responded: any;
    service.deleteDocument(uuid, docUuid, type).subscribe((res) => (responded = res));

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('DELETE');

    req.flush({ errorMessage: '' });
    expect(responded).toEqual({ errorMessage: '' });
  });
});
