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



@Injectable({ providedIn: 'root' })
export class ReportLoaderService {

    roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();
    primaryNeed: RoadWorkNeedFeature = new RoadWorkNeedFeature();

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
        managementAreaService: ManagementAreaService) {

        this.roadWorkActivityService = roadWorkActivityService;   
        this.roadWorkNeedService = roadWorkNeedService;     
        this.needsOfActivityService = needsOfActivityService;
        this.storageService = storageService;
        this.managementAreaService = managementAreaService;        

    }

    async generateReport(templateName: string, uuid: string) {
        await firstValueFrom(this.loadRoadWorkActivity$(uuid));
        const html: string = await this.loadReport(templateName, { uuid });  
        return html;
    }


    async loadReport(templateName: string, values: { [key: string]: string }): Promise<string> {
        
        if (values["uuid"] === undefined || values["uuid"] === null) {
            return `<pre style="color:red;">Error: UUID not provided.</pre>`;
        }
        
        if (templateName === undefined || templateName === null) {
            return `<pre style="color:red;">Error: Template name not provided.</pre>`;
        }
      
       
        if (!this.roadWorkActivity || !this.primaryNeed || !this.managementArea) {
            return `<pre style="color:red;">Error: RoadWorkActivity, PrimaryNeed or ManagementArea not set.</pre>`;
        }

        try {
            const path = `assets/templates/${templateName}.html`;

            const htmlTemplate = await this.http.get(path, { responseType: 'text' }).toPromise();

            const projectPerimeterMap = await this.loadProjectPerimeterMap();

            const htmlTableAssignedRoadWorkNeeds = this.prepareHtmlTable(
                this.needsOfActivityService.assignedRoadWorkNeeds.map((item) => ({
                    'Titel & Abschnitt': item.properties.name,
                    'Auslösegrund': item.properties.description,
                    'Auslösende:r': `${item.properties.orderer.firstName} ${item.properties.orderer.lastName}`,
                    'Werk': item.properties.orderer.organisationalUnit.abbreviation,
                    'Erstellt am': this.formatDate(item.properties.created), 
                    'Wunschtermin': this.formatDate(item.properties.finishOptimumTo),
                    'auslösend': item.properties.isPrimary ? 'Ja' : 'Nein'
                }))
            );

            const placeholders: Record<string, string> = {
                'DATUM': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity?.properties?.dateSks)),
                'DATUM_NAECHSTE_SKS': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity?.properties?.dateSks)),
                'DATUM_LETZTE_SKS': this.wrapPlaceholder('?DATUM_LETZTE_SKS?'),
                'DATUM_VERSAND_BEDARFSKLAERUNG_1': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity.properties.dateStartInconsult1)),
                'DATUM_VERSAND_BEDARFSKLAERUNG_2': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity.properties.dateStartInconsult2)),
                'DATUM_VERSAND_STELLUNGNAHME': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity.properties.dateReportStart)),
                'DATUM_SKS': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity?.properties?.dateSks)),
                'MAP_PERIMETER': projectPerimeterMap,
                'TITEL_ADRESSE_ABSCHNITT': this.wrapPlaceholder(`${this.roadWorkActivity?.properties?.name??"-"} / ${this.roadWorkActivity?.properties?.section??"-"}`),
                'TITEL_ADRESSE': this.wrapPlaceholder(this.roadWorkActivity?.properties?.name?? "-"),
                'ABSCHNITT': this.wrapPlaceholder(this.roadWorkActivity?.properties?.section?? "-"),
                'SKS_NR': this.wrapPlaceholder('?SKS_NR?'),
                'AUSLOESENDE': this.wrapPlaceholder(`${this.primaryNeed?.properties?.orderer?.firstName ?? "-"} ${this.primaryNeed?.properties?.orderer?.lastName ?? "-"}`),
                'GM': this.wrapPlaceholder(`${this.managementArea?.manager?.firstName ?? "-"} ${this.managementArea?.manager?.lastName ?? "-"}`),
                'GM2': this.wrapPlaceholder(`${this.roadWorkActivity?.properties?.areaManager?.firstName ?? "-"} ${this.roadWorkActivity?.properties?.areaManager?.lastName ?? "-"}`),                 
                'Projekttyp': this.wrapPlaceholder(this.roadWorkActivity?.properties?.projectType ?? "-"),
                'WERK_OE': this.wrapPlaceholder(this.roadWorkActivity?.properties?.projectManager? `${this.roadWorkActivity.properties.projectManager.firstName ?? "-"} ${this.roadWorkActivity.properties.projectManager.lastName ?? "-"}`: "- -"),
                'PL': this.wrapPlaceholder(this.managementArea?.properties?.kind?.name ?? '-'),
                'AUSLOESENDES_WERK': this.wrapPlaceholder(this.primaryNeed?.properties?.orderer?.organisationalUnit?.abbreviation ?? "-"),
                'MITWIRKENDE': this.wrapPlaceholder(this.getInvolvedOrgsNames() ?? "-"),
                'ZUGEWIESENE_BEDARFE': "<div style='background:yellow'>" + htmlTableAssignedRoadWorkNeeds + "</div>",

                'Ist_im_Aggloprogramm': this.wrapPlaceholder('[  ]'),
                'Laermschutzverordnung': this.wrapPlaceholder('[  ]'),
                'Stoerfallverordnung': this.wrapPlaceholder('[  ]'),
                'Haltekanten': this.wrapPlaceholder('[  ]'),
                'Vorstudie_BGK': this.wrapPlaceholder('[  ]')
            };

        


            const filledHtml = this.fillPlaceholders(htmlTemplate!, placeholders);

            return `<div style="width: 1000px; padding: 10px; font-family: Arial;">
                    ${filledHtml}
                    </div>
                    `;
        } catch (error) {
            console.error('Error loading report:', error);
            return `<pre style="color:red;">Error: ${JSON.stringify(error)}</pre>`;
        }
    }

    private async loadProjectPerimeterMap(): Promise<string> {
        try {
            const data = await this.storageService.load('ProjectPerimeter');
            return data || '';
        } catch (e) {
            console.warn('Could not load ProjectPerimeter from IndexedDB');
            return '';
        }
    }

    private wrapPlaceholder(content: string): string {
        return `<b style="background:yellow">${content}</b>`;
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

    fillPlaceholders(template: string, values: Record<string, string>): string {
        const normalizedValues: Record<string, string> = {};
        for (const key in values) {
            normalizedValues[key.toLowerCase()] = values[key];
        }

        return template.replace(/\[PLACEHOLDER_([A-Z0-9_]+)\]/gi, (_, rawKey) => {
            const key = rawKey.toLowerCase();
            return normalizedValues[key] ?? `[PLACEHOLDER_${rawKey}]`;
        });
    }

    prepareHtmlTable(data: Record<string, string>[]): string {
        if (data.length === 0) return '<p>No data</p>';

        const headers = Object.keys(data[0]);

        let htmlTable = '<table style="width: 70%; table-layout: fixed;font-size:11px" border="1" cellspacing="0" cellpadding="4"><thead><tr>';
        htmlTable += headers.map(h => `<th>${h}</th>`).join('');
        htmlTable += '</tr></thead><tbody>';

        htmlTable += data.map(row =>
            `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`
        ).join('');

        htmlTable += '</tbody></table>';

        return htmlTable;
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
