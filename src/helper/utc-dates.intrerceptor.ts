import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpContextToken
} from '@angular/common/http';
import { Observable } from 'rxjs';
import * as moment from 'moment';

// Optional per-request switch to skip conversion entirely.
export const NO_DATE_CONVERSION = new HttpContextToken<boolean>(() => false);

// Keys that should be treated as "date-only" (no time, no timezone).
// Values under these keys will be serialized as "YYYY-MM-DD".
const DATE_ONLY_KEYS = new Set<string>([
  'plannedDatesSks',
  'plannedDatesKap',
  'plannedDatesOks',
]);

@Injectable()
export class UtcDatesInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip if:
    // - request has no body
    // - explicitly disabled via context
    // - body is not JSON-like (e.g., multipart or urlencoded or a string)
    const contentType = req.headers.get('Content-Type') ?? '';
    const skip = req.context.get(NO_DATE_CONVERSION)
      || !req.body
      || contentType.includes('multipart/form-data')
      || contentType.includes('application/x-www-form-urlencoded')
      || typeof req.body === 'string';

    if (skip) return next.handle(req);

    // Convert all Date occurrences in the body
    const convertedBody = this.convertDates(req.body);

    // Forward the cloned request with the converted body
    return next.handle(req.clone({ body: convertedBody }));
  }

  /**
   * Recursively converts Date values in objects/arrays.
   * - If the current parent key is in DATE_ONLY_KEYS, serialize as "YYYY-MM-DD".
   * - Otherwise, serialize as ISO 8601 UTC ("...Z").
   */
  private convertDates(value: any, parentKey?: string): any {
    if (value == null) return value;

    // 1) Single Date instance
    if (value instanceof Date) {
      if (parentKey && DATE_ONLY_KEYS.has(parentKey)) {
        const m = moment(value);
        return m.isValid() ? m.format('YYYY-MM-DD') : null;
      }
      // Timestamp fields → UTC ISO string
      return moment(value).utc().toISOString();
    }

    // 2) Arrays: convert each element, preserving the parent key
    if (Array.isArray(value)) {
      return value.map(v => this.convertDates(v, parentKey));
    }

    // 3) Plain objects: convert each property, passing the property name
    if (typeof value === 'object') {
      // Do not touch binary/form bodies
      if (value instanceof Blob || value instanceof File || value instanceof FormData) {
        return value;
      }
      const out: any = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = this.convertDates(v, k);
      }
      return out;
    }

    // 4) Primitives: leave as-is
    return value;
  }
}
