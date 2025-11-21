import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';

import { RoadWorkActivityService } from './roadwork-activity.service';
import { RoadWorkNeedService } from './roadwork-need.service';
import { NeedsOfActivityService } from './needs-of-activity.service';
import { ManagementAreaService } from './management-area.service';
import { StorageService } from './storage.service';

import { map, switchMap, forkJoin, of, throwError, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MapCaptureService } from './map-capture.service';

@Injectable({ providedIn: 'root' })
export class ReportLoaderService {

  // Stores the currently processed Road Work Activity
  roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();

  // Primary need associated with the current road work activity
  primaryNeed: RoadWorkNeedFeature = new RoadWorkNeedFeature();

  // List of all needs (both assigned and registered), used for map rendering
  roadWorkNeeds: RoadWorkNeedFeature[] = [];

  // Injected services
  roadWorkActivityService: RoadWorkActivityService;
  roadWorkNeedService: RoadWorkNeedService;
  needsOfActivityService: NeedsOfActivityService;

  // Management area intersecting the current activity geometry
  managementArea: any = {};

  managementAreaService: ManagementAreaService;
  storageService: StorageService;

  constructor(
    private http: HttpClient,
    roadWorkActivityService: RoadWorkActivityService,
    roadWorkNeedService: RoadWorkNeedService,
    needsOfActivityService: NeedsOfActivityService,
    storageService: StorageService,
    managementAreaService: ManagementAreaService,
    private mapCapture: MapCaptureService
  ) {
    this.roadWorkActivityService = roadWorkActivityService;
    this.roadWorkNeedService = roadWorkNeedService;
    this.needsOfActivityService = needsOfActivityService;
    this.storageService = storageService;
    this.managementAreaService = managementAreaService;
  }


  /**
   * Generates an off-screen map image showing:
   *  - the activity perimeter
   *  - polygons of all road work needs
   * 
   * Image is saved into IndexedDB and returned as a DataURL.
  */
  async loadProjectPerimeterMap(): Promise<string> {
    try {
        const activityGeom: any = this.roadWorkActivity?.geometry;

        // Basic sanity check – we need at least some coordinates for the activity
        if (!activityGeom || !activityGeom.coordinates) {
            console.warn('loadProjectPerimeterMap: no activity geometry available');
            return '';
        }

        // Build activity polygons from geometry.coordinates
        // We support a few common shapes here to be robust:
        //  - [ [x, y], [x, y], ... ]              (simple ring)
        //  - [ [ [x, y], ... ] ]                  (GeoJSON Polygon)
        //  - already an array of { x, y } objects
        let activityPolygons: Array<Array<{ x: number; y: number }>> = [];

        const aCoords = activityGeom.coordinates;

        if (Array.isArray(aCoords) && aCoords.length > 0) {
            // Case: [ [x, y], [x, y], ... ]
            if (Array.isArray(aCoords[0]) && typeof aCoords[0][0] === 'number') {
                activityPolygons = [
                    (aCoords as [number, number][]).map(([x, y]) => ({ x, y }))
                ];
            }
            // Case: [ [ [x, y], ... ] ] (GeoJSON Polygon)
            else if (Array.isArray(aCoords[0]) && Array.isArray(aCoords[0][0])) {
                const outerRing = aCoords[0] as [number, number][];
                activityPolygons = [
                    outerRing.map(([x, y]) => ({ x, y }))
                ];
            }
            // Case: already an array of { x, y }
            else {
                activityPolygons = [aCoords as Array<{ x: number; y: number }>];
            }
        }

        if (!activityPolygons.length) {
            console.warn('loadProjectPerimeterMap: could not interpret activity geometry coordinates');
            return '';
        }

        // Build polygons for all road work needs
        const needsPolygons: Array<Array<{ x: number; y: number }>> =
            (this.roadWorkNeeds || []).flatMap((need: any) => {
                const geom: any = need?.geometry;
                if (!geom || !geom.coordinates) return [];

                const nCoords = geom.coordinates;

                // Similar handling as above – tolerate multiple structures
                if (Array.isArray(nCoords) && nCoords.length > 0) {
                    // Case: Polygon: [ [ [x, y], ... ] ]
                    if (Array.isArray(nCoords[0]) && Array.isArray(nCoords[0][0])) {
                        const outerRing = nCoords[0] as [number, number][];
                        return [
                            outerRing.map(([x, y]) => ({ x, y }))
                        ];
                    }
                    // Case: simple ring: [ [x, y], [x, y], ... ]
                    if (Array.isArray(nCoords[0]) && typeof nCoords[0][0] === 'number') {
                        return [
                            (nCoords as [number, number][]).map(([x, y]) => ({ x, y }))
                        ];
                    }
                }

                // If geometry shape is not recognised, we simply skip it
                return [];
            });

        // --- Page / size calculation (unchanged logic) ---

        const ptToPx = (pt: number) => Math.round(pt * (96 / 72));
        const cmToPt = (cm: number) => cm * (72 / 2.54);

        const page = { wPt: 595.28, hPt: 841.89 }; // A4 portrait
        const marginsCm = { top: 2, right: 1, bottom: 2, left: 2 };

        const contentWPt = page.wPt - cmToPt(marginsCm.left) - cmToPt(marginsCm.right);
        const contentHPt = page.hPt - cmToPt(marginsCm.top) - cmToPt(marginsCm.bottom);

        const contentWPx = ptToPx(contentWPt);
        const contentHPx = ptToPx(contentHPt);

        // Maintain 16:9 ratio for the map area
        let w = contentWPx;
        let h = Math.round(w * 9 / 16);
        if (h > contentHPx) {
            h = contentHPx;
            w = Math.round(h * 16 / 9);
        }

        // Generate off-screen map image
        const mapImageUrl = await this.mapCapture.captureMapOffscreen(
            undefined,
            w,
            h,
            [8.719, 47.499],   // fallback center
            13,                // fallback zoom
            true,
            activityPolygons,
            needsPolygons
        );

        // Persist image in storage for later reuse
        this.storageService.save('ProjectPerimeter', mapImageUrl);

        const data = await this.storageService.load('ProjectPerimeter');
        return data || '';
    } catch (e) {
       console.error('loadProjectPerimeterMap: error while generating map', e);
       return '';
    }
  }



  /**
   * Returns a list of unique organisation abbreviations
   * of involved users.
   */
  getInvolvedOrgsNames(): string {
    const result: string[] = [];
    if (this.roadWorkActivity?.properties?.involvedUsers) {
      for (const user of this.roadWorkActivity.properties.involvedUsers) {
        const abbr = user.organisationalUnit?.abbreviation;
        if (abbr && !result.includes(abbr)) result.push(abbr);
      }
    }
    return result.join(', ');
  }

  /**
   * Formats dates in dd.MM.yyyy format.
   */
  formatDate = (value: Date | string | undefined | null): string => {
    if (value === undefined || value === null) return '[Datum fehlt]';

    const d: Date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value); // fallback if not parsable

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');

    return `${day}.${month}.${d.getFullYear()}`;
  };

  /**
   * Loads a Road Work Activity and all required dependent data:
   *  - activity geometry
   *  - associated needs
   *  - management area
   *  - primary need (computed AFTER needs are loaded)
   *
   * Critical: ensures deterministic order of loading.
   */
  loadRoadWorkActivity$(uuid: string) {
    return this.roadWorkActivityService.getRoadWorkActivities(uuid).pipe(
      switchMap((activities: RoadWorkActivityFeature[]) => {
        // Expect exactly 1 activity per uuid
        if (activities.length !== 1) {
          return throwError(
            () => new Error(`Expected one RoadWorkActivity for UUID ${uuid}, got ${activities.length}`)
          );
        }

        const activity = activities[0];
        this.roadWorkActivity = activity;

        // IMPORTANT: reset state for new activity
        this.roadWorkNeeds = [];

        // Async: management area and associated needs
        const mgmt$ = this.loadManagementArea$(activity.geometry);
        const needs$ = this.loadAssociatedNeeds$(activity);

        // Wait for BOTH to finish
        return forkJoin([mgmt$, needs$]).pipe(
          tap(() => {
            // Compute primary need AFTER all associated needs are available
            this.primaryNeed = this.getPrimaryNeed();
          }),
          map(() => activity)
        );
      })
    );
  }

  /**
   * Selects the 'isPrimary' need from the assigned list.
   * If none exists, returns an empty RoadWorkNeedFeature.
   */
  private getPrimaryNeed(): RoadWorkNeedFeature {
    const assigned = this.needsOfActivityService.assignedRoadWorkNeeds;
    if (assigned && assigned.length > 0) {
      for (const need of assigned) {
        if (need.properties?.isPrimary) return need;
      }
    }
    return new RoadWorkNeedFeature();
  }

  /**
   * Loads the management area intersecting with the activity geometry
   * and populates roadWorkActivity.properties.areaManager.
   */
  private loadManagementArea$(geometry: any): Observable<void> {
    return this.managementAreaService.getIntersectingManagementArea(geometry).pipe(
      tap((managementArea: any) => {
        if (managementArea) {
          this.managementArea = managementArea;
          if (this.roadWorkActivity) {
            this.roadWorkActivity.properties.areaManager = managementArea.manager;
          }
        }
      }),
      map(() => void 0),
      catchError(err => {
        console.error('Error loading management area:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Loads all road-work needs assigned/registered to the activity.
   *
   * Populates:
   *  - assignedRoadWorkNeeds
   *  - nonAssignedRoadWorkNeeds
   *  - registeredRoadWorkNeeds
   *  - roadWorkNeeds (used for map rendering)
   *
   * IMPORTANT:
   *  This must finish BEFORE computing primaryNeed.
   */
  private loadAssociatedNeeds$(activity: RoadWorkActivityFeature): Observable<void> {
    const uuids = activity?.properties?.roadWorkNeedsUuids;

    // No needs assigned to this activity
    if (!uuids || uuids.length === 0) {
      this.needsOfActivityService.assignedRoadWorkNeeds = [];
      this.needsOfActivityService.nonAssignedRoadWorkNeeds = [];
      this.needsOfActivityService.registeredRoadWorkNeeds = [];
      this.roadWorkNeeds = [];
      return of(void 0);
    }

    // Load needs for this activity UUID
    return this.roadWorkNeedService
      .getRoadWorkNeeds(
        [],
        undefined, undefined, undefined,
        undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        activity.properties.uuid
      )
      .pipe(
        tap((needs: RoadWorkNeedFeature[]) => {
          // Separate assigned vs. registered
          const assigned: RoadWorkNeedFeature[] = [];
          const registered: RoadWorkNeedFeature[] = [];

          for (const need of needs) {
            const type = need.properties.activityRelationType;
            if (type === 'assignedneed') assigned.push(need);
            else if (type === 'registeredneed') registered.push(need);
          }

          // Update service state
          this.needsOfActivityService.assignedRoadWorkNeeds = assigned;
          this.needsOfActivityService.nonAssignedRoadWorkNeeds = registered;
          this.needsOfActivityService.registeredRoadWorkNeeds = registered;

          // Also store all needs for map rendering
          this.roadWorkNeeds = needs;
        }),
        map(() => void 0),
        catchError(err => {
          console.error('Error loading associated road work needs:', err);
          return throwError(() => err);
        })
      );
  }

  /**
   * Loads primary need by uuid (used only in older parts of app).
   * Prefer using getPrimaryNeed() inside loadRoadWorkActivity$.
   */
  private loadPrimaryNeed(primaryNeedUuid: string): void {
    if (!primaryNeedUuid) return;

    this.roadWorkNeedService.getRoadWorkNeeds([primaryNeedUuid]).subscribe({
      next: (needs) => {
        if (needs.length === 1) {
          this.primaryNeed = needs[0];
        } else {
          console.warn('Primary need not found or multiple found');
        }
      },
      error: (err) => {
        console.error('Error loading primary need:', err);
      },
    });
  }
}
