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

    async generateReport(templateName: string, reportType: string, children: any[]) {                
        const html: string = await this.loadReport(templateName, reportType, children);
        return html;
    }


    async loadReport(templateName: string, reportType: string, children: any[]): Promise<string> {
                
        
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
                    'Titel & Abschnitt': item.properties.name + '-' + reportType,
                    'Auslösegrund': item.properties.description,
                    'Auslösende:r': `${item.properties.orderer.firstName} ${item.properties.orderer.lastName}`,
                    'Werk': item.properties.orderer.organisationalUnit.abbreviation,
                    'Erstellt am': this.formatDate(item.properties.created), 
                    'Wunschtermin': this.formatDate(item.properties.finishOptimumTo),
                    'auslösend': item.properties.isPrimary ? 'Ja' : 'Nein'
                }))
            );
            
            const htmlTablePresentPersons = this.prepareHtmlTable(
                children
                .filter(item =>
                    !item.isRoadworkProject === true
                    && item.isPresent === true
                    && item.shouldBePresent === true    
                )                
                .map(item => ({
                    Name: item.name,
                    Organisation: item.department,
                    Anwesend: item.isPresent ? 'Ja' : 'Nein'
                }))
            );

            const htmlTableExcusedPersons = this.prepareHtmlTable(
                children
                .filter(item =>
                    !item.isRoadworkProject === true     
                    && item.isPresent === false  
                    && item.shouldBePresent === true                        
                )                
                .map(item => ({
                    Name: item.name,
                    Organisation: item.department,
                    Anwesend: item.isPresent ? 'Ja' : 'Nein'
                }))
            );

            const htmlTableDistributionListPersons = this.prepareHtmlTable(
                children
                .filter(item =>
                    !item.isRoadworkProject === true
                    && item.isDistributionList === true                                           
                )                
                .map(item => ({
                    Name: item.name,
                    Organisation: item.department,
                    Verteiler: item.isDistributionList ? 'Ja' : 'Nein'
                }))
            );

            const placeholders: Record<string, string> = {
                'SESSION_TYPE': reportType,
                'VORSITZ': this.wrapPlaceholder('Stefan Gahler (TBA APK)'),
                'DATUM': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity?.properties?.dateSks)),
                'DATUM_NAECHSTE_SKS': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity?.properties?.dateSksPlanned)),
                'DATUM_LETZTE_SKS': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity?.properties?.dateSks)),
                'DATUM_VERSAND_BEDARFSKLAERUNG_1': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity.properties.dateStartInconsult1)),
                'DATUM_VERSAND_BEDARFSKLAERUNG_2': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity.properties.dateStartInconsult2)),
                'DATUM_VERSAND_STELLUNGNAHME': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity.properties.dateReportStart)),
                'DATUM_SKS': this.wrapPlaceholder(this.formatDate(this.roadWorkActivity?.properties?.dateSks)),                                                                
                'SKS_Nr': this.wrapPlaceholder(this.roadWorkActivity?.properties?.roadWorkActivityNo ?? "-"),
                'GM': this.wrapPlaceholder(`${this.managementArea?.manager?.firstName ?? "-"} ${this.managementArea?.manager?.lastName ?? "-"}`),
                'GM2': this.wrapPlaceholder(`${this.roadWorkActivity?.properties?.areaManager?.firstName ?? "-"} ${this.roadWorkActivity?.properties?.areaManager?.lastName ?? "-"}`),                                                           
                'VORGEHEN': 'Vorgehen',
                'ANWESENDE': "<div>" + htmlTablePresentPersons + "</div>",                
                'ENTSCHULDIGT': "<div>" + htmlTableExcusedPersons + "</div>",                
                'VERTEILER': "<div>" + htmlTableDistributionListPersons + "</div>",  
                
            };

            console.log("placeholders--->", placeholders);

            placeholders['BAUVORHABEN_LISTE'] = await this.prepareRoadWorkActivity(children);

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

    private wrapPlaceholder(content: string): string {
        return `<b>${content}</b>`;
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
        if (data.length === 0) return '<p>-</p>';

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

    async prepareRoadWorkActivity(projects: any[]) {
        const sectionTpl = `
            <table style="width: 100%; margin: 0 auto;">
                <tr>
                    <td style="background:silver">
                        <p><strong>Bauvorhaben: [PLACEHOLDER_TITEL_ADRESSE_ABSCHNITT]</strong></p>
                    </td>
                </tr>
            </table>
            <p>        
                <img src="[PLACEHOLDER_MAP_PERIMETER]"
                alt="Mapa"
                style="display:block;width:510.24pt;height:auto;max-height:728.50pt;page-break-inside:avoid;" />
            </p>                                    
            <p>Auslösende:r: [PLACEHOLDER_AUSLOESENDE]</p>
            <p>Auslösendes Werk: [PLACEHOLDER_AUSLOESENDES_WERK]</p>
            <p>Gebietsmanagement: [PLACEHOLDER_GM]</p>            
            <p>Lead Realisierung (Phase 5/Baustelle): [PLACEHOLDER_WERK_OE] / [PLACEHOLDER_PL] (Hinweis: wird an SKS definiert)</p>
            <p>Mitwirkende: [PLACEHOLDER_AUSLOESENDES_WERK] sowie [PLACEHOLDER_MITWIRKENDE]</p>
            
            <p>[manuell ausfüllen] Beschreibt, wie was umgesetzt werden soll und warum. </p>
            <p>Falls vorhanden, hier ggf. auch Ausgangslage notieren.» </p>
            <p>2. [PLACEHOLDER_VORGEHEN]</p>
            <p><strong>Zugewiesene</strong> (berücksichtigte) Bedarfe</p>
            <p>
            [PLACEHOLDER_ZUGEWIESENE_BEDARFE]
            </p>
            <p><strong>Aspekte/Faktoren </strong></p>
            <p>Folgende Aspekte und/oder Faktoren können das Bauvorhaben beeinflussen:</p>
            <table style="padding:3px;font-size:12px;border:1px">
                <tr>
                    <td>
                        [PLACEHOLDER_Ist_im_Aggloprogramm]
                    </td>
                    <td>
                        Ist im Aggloprogramm vorgesehen/eingegeben
                    </td>
                </tr>
                <tr>
                    <td>
                        [PLACEHOLDER_Laermschutzverordnung]
                    </td>
                    <td>
                        <p>Untersteht der Lärmschutzverordnung (LSV) / Akustisches Projekt</p>
                    </td>
                </tr>
                <tr>
                    <td>
                        [PLACEHOLDER_Stoerfallverordnung]
                    </td>
                    <td>
                        <p>Störfallverordnung</p>
                    </td>
                </tr>
                <tr>
                    <td>
                        [PLACEHOLDER_Haltekanten]
                    </td>
                    <td>
                        <p>Haltekanten sind betroffen</p>
                    </td>
                </tr>
                <tr> 
                    <td>
                        [PLACEHOLDER_Vorstudie_BGK]       
                    <td>
                        <p>Vorstudie/BGK ist vorgesehen</p>
                    </td>
                </tr> 
                <tr> 
                    <td>
                        [PLACEHOLDER_Uebergeordnete_Massnahme]       
                    <td>
                        <p>Uebergeordnete Massnahme</p>
                    </td>
                </tr> 
                <tr> 
                    <td>
                        [PLACEHOLDER_Begehrensaeusserung_45]       
                    <td>
                        <p>Begehrensäusserung §&nbsp;45</p>
                    </td>
                </tr> 
                <tr> 
                    <td>
                        [PLACEHOLDER_Mitwirkungsverfahren_13]       
                    <td>
                        <p>Mitwirkungsverfahren §&nbsp;13</p>
                    </td>
                </tr> 
                <tr> 
                    <td>
                        [PLACEHOLDER_Planauflage_16]       
                    <td>
                        <p>Planauflage §&nbsp;16</p>
                    </td>
                </tr> 
            </table>
            <div class="page-break"></div>
        `;

        const fill = (tpl: string, map: Record<string, string>) =>
            tpl.replace(/\[PLACEHOLDER_([A-Za-z0-9_]+)\]/g, (_m, key) => map[key] ?? "");

        const sections: string[] = [];
        
        for (const project of projects) {
            if (!project?.isRoadworkProject) continue;

            await firstValueFrom(this.loadRoadWorkActivity$(project.id));        

            const mapUrl = await this.loadProjectPerimeterMap();

            const htmlSection = fill(sectionTpl, {
                TITEL_ADRESSE_ABSCHNITT: this.wrapPlaceholder(`${this.roadWorkActivity?.properties?.name ?? "-"} / ${this.roadWorkActivity?.properties?.section ?? "-"}`),                                
                AUSLOESENDE: this.wrapPlaceholder(`${this.primaryNeed?.properties?.orderer?.firstName ?? "-"} ${this.primaryNeed?.properties?.orderer?.lastName ?? "-"}`),
                AUSLOESENDES_WERK: this.wrapPlaceholder(this.primaryNeed?.properties?.orderer?.organisationalUnit?.abbreviation ?? "-"),
                GM: this.wrapPlaceholder(`${this.managementArea?.manager?.firstName ?? "-"} ${this.managementArea?.manager?.lastName ?? "-"}`),                
                WERK_OE: this.wrapPlaceholder(this.roadWorkActivity?.properties?.projectManager? `${this.roadWorkActivity.properties.projectManager.firstName ?? "-"} ${this.roadWorkActivity.properties.projectManager.lastName ?? "-"}`: "- -"),
                PL: this.wrapPlaceholder(this.managementArea?.properties?.kind?.name ?? '-'),
                MITWIRKENDE: this.wrapPlaceholder(this.getInvolvedOrgsNames() ?? "-"),
                Ist_im_Aggloprogramm: this.wrapPlaceholder(this.roadWorkActivity.properties.isAggloprog ? '[ x ]' : "[&nbsp;&nbsp;&nbsp;]"),
                Laermschutzverordnung: this.wrapPlaceholder('[ ? ]'),
                Stoerfallverordnung: this.wrapPlaceholder('[ ? ]'),
                Haltekanten: this.wrapPlaceholder(this.roadWorkActivity.properties.isStudy ? '[ x ]' : '[&nbsp;&nbsp;&nbsp;]'),
                Vorstudie_BGK: this.wrapPlaceholder(this.roadWorkActivity.properties.isStudy ? '[ x ]' : '[&nbsp;&nbsp;&nbsp;]'),
                Uebergeordnete_Massnahme: this.wrapPlaceholder(this.roadWorkActivity.properties.overarchingMeasure ? '[ x ]' : '[&nbsp;&nbsp;&nbsp;]'),
                Begehrensaeusserung_45: this.wrapPlaceholder(this.roadWorkActivity.properties.isDesire ? '[ x ]' : '[&nbsp;&nbsp;&nbsp;]'),
                Mitwirkungsverfahren_13: this.wrapPlaceholder(this.roadWorkActivity.properties.isParticip ? '[ x ]' : '[&nbsp;&nbsp;&nbsp;]'),
                Planauflage_16: this.wrapPlaceholder(this.roadWorkActivity.properties.isPlanCirc ? '[ x ]' : '[&nbsp;&nbsp;&nbsp;]'),
                ZUGEWIESENE_BEDARFE: "<div>" + this.prepareHtmlTable(
                    this.needsOfActivityService.assignedRoadWorkNeeds.map((item) => ({
                        'Titel & Abschnitt': item.properties.name + '-' + project.reportType,
                        'Auslösegrund': item.properties.description,
                        'Auslösende:r': `${item.properties.orderer.firstName} ${item.properties.orderer.lastName}`,
                        'Werk': item.properties.orderer.organisationalUnit.abbreviation,
                        'Erstellt am': this.formatDate(item.properties.created), 
                        'Wunschtermin': this.formatDate(item.properties.finishOptimumTo),
                        'auslösend': item.properties.isPrimary ? 'Ja' : 'Nein'
                    }))
                ) + "</div>",
                MAP_PERIMETER: mapUrl ?? "",
            });

            sections.push(htmlSection);
        }

        return sections.join('<div class="page-break"></div>');
    }

}
