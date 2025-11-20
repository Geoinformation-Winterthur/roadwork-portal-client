import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';

import { RoadWorkActivityService } from './roadwork-activity.service';
import { RoadWorkNeedService } from './roadwork-need.service';
import { NeedsOfActivityService } from './needs-of-activity.service';
import { ManagementAreaService } from './management-area.service';
import { StorageService } from './storage.service';
import { map, switchMap, forkJoin, of, throwError, Observable, firstValueFrom } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MapCaptureService } from './map-capture.service';


@Injectable({ providedIn: 'root' })
export class ReportLoaderService {

    roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();
    primaryNeed: RoadWorkNeedFeature = new RoadWorkNeedFeature();
    roadWorkNeeds: any[] = [];

    roadWorkActivityService: RoadWorkActivityService;
    roadWorkNeedService: RoadWorkNeedService;

    needsOfActivityService: NeedsOfActivityService;
        
    managementArea: any = { };

    managementAreaService: ManagementAreaService;
    storageService: StorageService;    

    constructor(private http: HttpClient,
        roadWorkActivityService: RoadWorkActivityService,
        roadWorkNeedService: RoadWorkNeedService,
        needsOfActivityService: NeedsOfActivityService,
        storageService: StorageService,
        managementAreaService: ManagementAreaService,
        private mapCapture: MapCaptureService) {

        this.roadWorkActivityService = roadWorkActivityService;   
        this.roadWorkNeedService = roadWorkNeedService;     
        this.needsOfActivityService = needsOfActivityService;
        this.storageService = storageService;
        this.managementAreaService = managementAreaService;        

    }   

    async loadProjectPerimeterMap(): Promise<string> {
        try {                        
            
            const geoJson = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates: JSON.stringify(this.roadWorkActivity.geometry.coordinates) },
                        properties: {},
                    },
                ],
            };            

            const needsPolygons: Array<Array<{ x: number; y: number }>> =
                this.roadWorkNeeds.map((item) =>                    
                    item.geometry.coordinates[0].map(([x, y]: [number, number]) => ({
                    x,
                    y
                }))
            );

            const activityPolygons = [this.roadWorkActivity.geometry.coordinates as Array<{ x: number; y: number }>]

            const ptToPx = (pt: number) => Math.round(pt * (96 / 72));
            const cmToPt = (cm: number) => cm * (72 / 2.54);

            const page = { wPt: 595.28, hPt: 841.89 }; // A4 portrait
            const marginsCm = { top: 2, right: 1, bottom: 2, left: 2 };

            const contentWPt = page.wPt - cmToPt(marginsCm.left) - cmToPt(marginsCm.right); // ≈ 510.24 pt
            const contentHPt = page.hPt - cmToPt(marginsCm.top) - cmToPt(marginsCm.bottom); // ≈ 728.50 pt

            const contentWPx = ptToPx(contentWPt); // ≈ 680 px
            const contentHPx = ptToPx(contentHPt); // ≈ 971 px
            
            let w = contentWPx;
            let h = Math.round(w * 9 / 16);
            if (h > contentHPx) { h = contentHPx; w = Math.round(h * 16 / 9); }



            // Generate off-screen map image
            const mapImageUrl = await this.mapCapture.captureMapOffscreen(
                undefined,
                w,
                h,
                [8.719, 47.499],
                13,
                true,
                activityPolygons,
                needsPolygons
            );  

            this.storageService.save('ProjectPerimeter', mapImageUrl);

            const data = await this.storageService.load('ProjectPerimeter');
            return data || '';
        } catch (e) {
            console.warn('Could not load ProjectPerimeter from IndexedDB');
            return '';
        }
    }

    getInvolvedOrgsNames(): string {
        let result: string[] = [];
        if (this.roadWorkActivity) {
            for (let involvedUser of this.roadWorkActivity.properties.involvedUsers) {
                if (!result.includes(involvedUser.organisationalUnit.abbreviation))
                result.push(involvedUser.organisationalUnit.abbreviation);
            }
        }
        return result.join(', ');
    }        

    formatDate = (value: Date | string | undefined | null): string => {
        if (value === undefined || value === null) return "[Datum fehlt]";
        const d: Date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${day}.${month}.${d.getFullYear()}`;
    };


    loadRoadWorkActivity$(uuid: string) {
        return this.roadWorkActivityService.getRoadWorkActivities(uuid).pipe(
            switchMap((activities: RoadWorkActivityFeature[]) => {
                if (activities.length !== 1) {
                    return throwError(() => new Error(`Expected one RoadWorkActivity for UUID ${uuid}, got ${activities.length}`));
                }

                const activity = activities[0];
                this.roadWorkActivity = activity;
                this.primaryNeed = this.getPrimaryNeed();
            
            
                const mgmt$  = this.loadManagementArea$(activity.geometry); 
                const needs$ = this.loadAssociatedNeeds$(activity);        
                needs$.forEach((need: any) => { 
                    this.roadWorkNeeds.push(need.geometry.coordinates);
                });

                return forkJoin([mgmt$, needs$]).pipe(map(() => activity));
            })
        );
    }

    private getPrimaryNeed(): RoadWorkNeedFeature {
        if (this.needsOfActivityService.assignedRoadWorkNeeds.length > 0) {
        for (let roadWorkNeed of this.needsOfActivityService.assignedRoadWorkNeeds) {
            if (roadWorkNeed.properties.isPrimary)
            return roadWorkNeed;
        }
        }
        return new RoadWorkNeedFeature();
    }

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


    private loadAssociatedNeeds$(activity: RoadWorkActivityFeature): Observable<void> {
        const uuids = activity?.properties?.roadWorkNeedsUuids;
        if (!uuids || uuids.length === 0) {
            
            this.needsOfActivityService.assignedRoadWorkNeeds = [];
            this.needsOfActivityService.nonAssignedRoadWorkNeeds = [];
            this.needsOfActivityService.registeredRoadWorkNeeds = [];
            return of(void 0);
        }

        return this.roadWorkNeedService.getRoadWorkNeeds(
            [], undefined, undefined, undefined,
            undefined, undefined, undefined, undefined, undefined, undefined, undefined,
            activity.properties.uuid
        ).pipe(
            tap((needs: RoadWorkNeedFeature[]) => {
            const assigned: RoadWorkNeedFeature[] = [];
            const registered: RoadWorkNeedFeature[] = [];

            for (const need of needs) {
                const type = need.properties.activityRelationType;
                if (type === 'assignedneed') assigned.push(need);
                else if (type === 'registeredneed') registered.push(need);
            }

            this.needsOfActivityService.assignedRoadWorkNeeds = assigned;
            this.needsOfActivityService.nonAssignedRoadWorkNeeds = registered;
            this.needsOfActivityService.registeredRoadWorkNeeds = registered;
            }),
            map(() => void 0),
            catchError(err => {
                console.error('Error loading associated road work needs:', err);
                return throwError(() => err); 
            })
        );
    }

    private loadPrimaryNeed(primaryNeedUuid: string): void {
        if (!primaryNeedUuid) return;

        this.roadWorkNeedService.getRoadWorkNeeds([primaryNeedUuid]).subscribe({
            next: (needs) => {
                if (needs.length === 1) {
                    this.primaryNeed = needs[0];
                } else {
                    console.warn("Primary need not found or multiple found");
                }
            },
            error: (err) => {
                console.error("Error loading primary need:", err);
            }
        });
    }   

}
