import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
import * as maplibregl from 'maplibre-gl';
import { ProvisExplorerService, ExplorerActivity, ExplorerDetail } from 'src/services/provis-explorer.service';

@Component({
  selector: 'app-provis-explorer',
  templateUrl: './provis-explorer.component.html',
  styleUrls: ['./provis-explorer.component.css']
})
export class ProvisExplorerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  activities: ExplorerActivity[] = [];
  detail?: ExplorerDetail;
  selected?: ExplorerActivity;
  isLoading = false;
  error = '';
  activeTab = 'provis';
  showWikis = true;
  showProvis = true;
  pitched = false;
  // Background buildings are a visual context, never inferred PROVIS geometry.
  readonly vectorStyleUrl = 'https://tiles.openfreemap.org/styles/liberty';
  private map?: maplibregl.Map;
  private requestId = 0;

  readonly labels: { [key: string]: string } = {
    MATCH: 'Eindeutig', MULTIPLE: 'Mehrere Kandidaten', PARTIAL: 'Teilweise',
    NO_MATCH: 'Kein Treffer', NO_REFERENCE: 'Keine Nummer', NO_EXCEL: 'Nicht in Excel'
  };
  readonly statusLabels: { [key: string]: string } = {
    'requirement': '11/Bedarf',
    'review': '12/Prüfung',
    'verified1': '12/verifiziert-1',
    'verified2': '12/verifiziert-2',
    'inconsult1': '12/Bedarfsklärung - 1.Iteration',
    'inconsult2': '12/Bedarfsklärung - 2.Iteration',
    'reporting': '12/Stellungnahme',
    'coordinated': '12/koordiniert',
    'prestudy': '21/Vorstudie',
    'planning_p1': '1/Strategische Planung',
    'initiation_p13': '13/Initialisieren',
    'prestudy_p2': '2/Vorstudie',
    'design_p3': '3/Projektierung',
    'predesign_p31': '31/Vorprojekt',
    'design_p32': '32/Bauprojekt',
    'approval_p33': '33/Bewilligungsverfahren',
    'tendering_p4': '4/Ausschreibung',
    'tendering_p41': '41/Ausschreibung / Vergabe',
    'construction_p5': '5/Realisierung',
    'executiondesign_p51': '51/Ausführungsprojekt',
    'execution_p52': '52/Ausführung',
    'commissioning_p53': '53/Inbetriebnahme',
    'operations_p6': '6/Bewirtschaftung',
    'closed_p61': '61/Abgerechnet',
    'archived': 'Archiviert',
    'need_archived': 'Bedarf archiviert',
    'deferred': 'zurückgestellt',
    'suspended': 'sistiert',
    'suspended_after_sks': '12/ruhend nach SKS',
    'construction_accounting_p53': '53/Bauabrechnung',
    'design3d': '3/Projektierung'
  };
  statusName(value: any): string {
    if (value == null || value === '') return '';
    return this.statusLabels[String(value)] || String(value);
  }
  readonly defaultColDef: ColDef = { sortable: true, filter: true, resizable: true, floatingFilter: true };
  readonly mainColumns: ColDef[] = [
    { field: 'bv_nr', headerName: 'BV-Nr.', width: 137, pinned: 'left' },
    { field: 'name', headerName: 'Bauvorhaben', minWidth: 250, flex: 1 },
    { field: 'status', headerName: 'Status', minWidth: 170, width: 195, valueFormatter: p => this.statusName(p.value) },
    { field: 'quality', headerName: 'Abgleich', width: 160, valueFormatter: p => this.labels[p.value] || p.value },
    { field: 'reference_count', headerName: 'Referenzen', width: 115 },
    { field: 'provis_project_count', headerName: 'PROVIS', width: 100 },
    { field: 'need_count', headerName: 'Bedarfe', width: 105 },
    { field: 'costs_total', headerName: 'Kosten CHF', width: 150, valueFormatter: p => this.money(p.value) }
  ];
  readonly provisColumns: ColDef[] = [
    { field: 'source_column', headerName: 'Excel', width: 94 },
    { field: 'reference_number', headerName: 'Referenz', width: 160 },
    { field: 'match_status', headerName: 'Treffer', width: 110 },
    { field: 'projekt_nr', headerName: 'PROVIS-Nr.', width: 150 },
    { field: 'provis_name', headerName: 'Projektname', minWidth: 240, flex: 1 },
    { field: 'bis_nr', headerName: 'BIS', width: 110 },
    { field: 'provis_status', headerName: 'Status', width: 148, valueFormatter: p => this.statusName(p.value) },
    { field: 'match_kind', headerName: 'Zuordnung', width: 125, valueFormatter: p => p.value === 'SUBPROJECT' ? 'Teilprojekt' : p.value === 'EXACT' ? 'Exakt' : '—' },
    { field: 'kreditsumme', headerName: 'Kredit CHF', width: 155, valueFormatter: p => this.money(p.value) },
    { field: 'geojson', headerName: 'Punkte', width: 100, valueFormatter: p => p.value ? 'Vorhanden' : 'Keine' }
  ];
  readonly needColumns: ColDef[] = [
    { field: 'name', headerName: 'Bedarf', flex: 1 },
    { field: 'status', headerName: 'Status', width: 190, valueFormatter: p => this.statusName(p.value) },
    { field: 'activityrelationtype', headerName: 'Relation', width: 180 },
    { field: 'is_primary', headerName: 'Primär', width: 100 }
  ];
  readonly costColumns: ColDef[] = [
    { field: 'project_type', headerName: 'Kostentyp', flex: 1 },
    { field: 'erp_number', headerName: 'ERP-Nr.', width: 155 },
    { field: 'costs', headerName: 'Kosten CHF', width: 160, valueFormatter: p => this.money(p.value) },
    { field: 'costs_comment', headerName: 'Bemerkung', flex: 1 }
  ];

  constructor(private explorer: ProvisExplorerService) {}

  ngAfterViewInit(): void {
    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: this.vectorStyleUrl,
      center: [8.724, 47.499], zoom: 12, pitch: 0, bearing: 0
    });
    this.map.addControl(new maplibregl.NavigationControl({}), 'top-right');
    this.map.on('load', () => {
      if (!this.map) { return; }
      this.addCityBuildings();
      this.map.addSource('wikis-shape', { type: 'geojson', data: this.emptyFeatures() });
      this.map.addSource('provis-points', { type: 'geojson', data: this.emptyFeatures() });
      this.map.addLayer({ id: 'wikis-polygon', type: 'fill', source: 'wikis-shape', paint: { 'fill-color': '#1676a3', 'fill-opacity': 0.23 } });
      this.map.addLayer({ id: 'wikis-outline', type: 'line', source: 'wikis-shape', paint: { 'line-color': '#036798', 'line-width': 3 } });
      this.map.addLayer({ id: 'provis-circles', type: 'circle', source: 'provis-points', paint: {
        'circle-radius': 7, 'circle-color': '#ec742e', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff'
      } });
      this.map.on('click', 'provis-circles', e => {
        const feature = e.features && e.features[0];
        if (!feature || !this.map) { return; }
        const geometry = feature.geometry as any;
        if (geometry.type === 'Point') {
          new maplibregl.Popup({ closeButton: true }).setLngLat(geometry.coordinates)
            .setText(String(feature.properties?.['label'] || 'PROVIS-Punkt')).addTo(this.map);
        }
      });
      this.map.on('mouseenter', 'provis-circles', () => { if (this.map) this.map.getCanvas().style.cursor = 'pointer'; });
      this.map.on('mouseleave', 'provis-circles', () => { if (this.map) this.map.getCanvas().style.cursor = ''; });
      this.updateMap();
    });
    this.refresh();
  }

  ngOnDestroy(): void { this.map?.remove(); }
  refresh(): void {
    this.isLoading = true;
    this.error = '';
    this.explorer.activities().subscribe({
      next: rows => { this.activities = rows; this.isLoading = false; },
      error: () => { this.isLoading = false; this.error = 'Die Daten konnten nicht geladen werden.'; }
    });
  }
  onRowClicked(event: RowClickedEvent): void {
    const activity = event.data as ExplorerActivity;
    if (!activity) { return; }
    this.selected = activity;
    this.detail = undefined;
    this.updateMap();
    const requestId = ++this.requestId;
    this.explorer.detail(activity.uuid).subscribe({
      next: d => { if (requestId !== this.requestId) { return; } this.detail = d; this.updateMap(true); },
      error: () => { if (requestId === this.requestId) { this.error = 'Detaildaten konnten nicht geladen werden.'; } }
    });
  }
  money(value: any): string {
    if (value === null || value === undefined || value === '') { return '—'; }
    const n = Number(value);
    return isNaN(n) ? '—' : n.toLocaleString('de-CH', { maximumFractionDigits: 0 });
  }
  get totalCosts(): number { return (this.detail?.costs || []).reduce((sum, c) => sum + (Number(c.costs) || 0), 0); }
  get creditSum(): number { return (this.detail?.provis || []).filter(p => !!p.projekt_nr).reduce((sum, p) => sum + (Number(p.kreditsumme) || 0), 0); }
  get compareRows(): any[] {
    if (!this.detail) { return []; }
    const a = this.detail.activity;
    const i = this.detail.excel[0] || {};
    return [
      { attribute: 'Titel', excel: i.excel_title, wikis: a.name, provis: this.detail.provis.filter(x => x.provis_name).map(x => x.provis_name).join(' | ') },
      { attribute: 'Status', excel: i.excel_status, wikis: this.statusName(a.status), provis: this.detail.provis.filter(x => x.provis_status).map(x => this.statusName(x.provis_status)).join(' | ') },
      { attribute: 'Hauptprojekt (G)', excel: i.provis_g, wikis: a.erp_number, provis: this.detail.provis.filter(x => x.source_column === 'G').map(x => x.projekt_nr).join(' | ') },
      { attribute: 'Projekt 322 (N)', excel: i.provis_n, wikis: '', provis: this.detail.provis.filter(x => x.source_column === 'N').map(x => x.projekt_nr).join(' | ') },
      { attribute: 'Projekt 328 (O)', excel: i.provis_o, wikis: '', provis: this.detail.provis.filter(x => x.source_column === 'O').map(x => x.projekt_nr).join(' | ') },
      { attribute: 'Dokument-Link', excel: i.excel_url, wikis: a.url, provis: '' },
      { attribute: 'Kosten (Bauvorhaben)', excel: '', wikis: a.costs, provis: this.creditSum }
    ];
  }
  setTab(tab: string): void { this.activeTab = tab; }
  setPitch(): void {
    this.pitched = !this.pitched;
    const map = this.map;
    if (!map) return;
    if (map.getLayer('city-buildings-3d')) {
      map.setLayoutProperty('city-buildings-3d', 'visibility', this.pitched ? 'visible' : 'none');
    }
    map.easeTo({ pitch: this.pitched ? 60 : 0, bearing: this.pitched ? -15 : 0, zoom: this.pitched ? Math.max(map.getZoom(), 15) : map.getZoom(), duration: 550 });
  }
  private addCityBuildings(): void {
    if (!this.map) return;
    // The official MapLibre demo uses this vector tileset for real building footprints.
    if (!this.map.getSource('city-buildings-vector')) {
      this.map.addSource('city-buildings-vector', { type: 'vector', url: 'https://tiles.openfreemap.org/planet' });
    }
    if (this.map.getLayer('city-buildings-3d')) return;
    const styleLayers = this.map.getStyle().layers || [];
    const firstLabel = styleLayers.find(l => l.type === 'symbol' && !!(l.layout && l.layout['text-field']));
    this.map.addLayer({
      id: 'city-buildings-3d',
      source: 'city-buildings-vector',
      'source-layer': 'building',
      type: 'fill-extrusion', minzoom: 15,
      layout: { visibility: 'none' },
      filter: ['!=', ['get', 'hide_3d'], true],
      paint: {
        'fill-extrusion-color': '#b7bfca',
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.77
      }
    }, firstLabel?.id);
  }
  setLayers(): void {
    if (!this.map?.isStyleLoaded()) { return; }
    for (const id of ['wikis-polygon', 'wikis-outline']) this.map.setLayoutProperty(id, 'visibility', this.showWikis ? 'visible' : 'none');
    this.map.setLayoutProperty('provis-circles', 'visibility', this.showProvis ? 'visible' : 'none');
  }
  private emptyFeatures(): any { return { type: 'FeatureCollection', features: [] }; }
  private updateMap(fit = false): void {
    if (!this.map?.isStyleLoaded()) { return; }
    const shape: any[] = [], points: any[] = [];
    const addFeatures = (json: string, to: any[], label: string) => {
      try {
        const geometry = JSON.parse(json);
        if (geometry?.type === 'MultiPoint') {
          for (let index = 0; index < geometry.coordinates.length; index++) {
            to.push({ type: 'Feature', properties: { label: label + ' · Punkt ' + (index + 1) }, geometry: { type: 'Point', coordinates: geometry.coordinates[index] } });
          }
        } else if (geometry) { to.push({ type: 'Feature', properties: { label }, geometry }); }
      } catch (_) { /* Ignore invalid geometry from a source record. */ }
    };
    if (this.detail?.activity.geojson) addFeatures(this.detail.activity.geojson, shape, 'WiKIS');
    for (const p of this.detail?.provis || []) {
      if (p.geojson) addFeatures(p.geojson, points, 'PROVIS ' + p.projekt_nr);
    }
    (this.map.getSource('wikis-shape') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: shape } as any);
    (this.map.getSource('provis-points') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: points } as any);
    this.setLayers();
    if (fit && shape.length + points.length) {
      const bounds = new maplibregl.LngLatBounds();
      const visit = (coordinates: any): void => {
        if (!Array.isArray(coordinates)) { return; }
        if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') bounds.extend([coordinates[0], coordinates[1]]);
        else for (const child of coordinates) visit(child);
      };
      for (const f of [...shape, ...points]) visit(f.geometry.coordinates);
      if (!bounds.isEmpty()) this.map.fitBounds(bounds, { padding: 65, maxZoom: 17, duration: 450 });
    }
  }
}
