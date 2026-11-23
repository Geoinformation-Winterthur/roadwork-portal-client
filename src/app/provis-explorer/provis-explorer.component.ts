import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { ColDef, RowClickedEvent, ColumnApi, GridReadyEvent } from 'ag-grid-community';
import * as maplibregl from 'maplibre-gl';
import { ProvisExplorerService, ExplorerActivity, ExplorerDetail } from 'src/services/provis-explorer.service';

@Component({
  selector: 'app-provis-explorer',
  templateUrl: './provis-explorer.component.html',
  styleUrls: ['./provis-explorer.component.css']
})
export class ProvisExplorerComponent implements AfterViewInit, OnDestroy {
  activities: ExplorerActivity[] = [];
  detail?: ExplorerDetail;
  selected?: ExplorerActivity;
  isLoading = false;
  isDetailLoading = false;
  error = '';
  activeTab = 'provis';
  showWikis = true;
  showProvis = true;
  showNeeds = true;
  selectedNeedUuid: string | null = null;
  topPanelHeight = 308;
  explorerHeight = 750;
  lowerPanelMinHeight = 285;
  detailWidth = 60;
  private resizeMode: 'width' | 'height' | 'lowerHeight' | null = null;
  private startDrag = 0;
  private startSize = 0;
  private provisColumnApi?: ColumnApi;
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  pitched = false;
  // Background buildings are a visual context, never inferred PROVIS geometry.
  readonly vectorStyleUrl = 'https://tiles.openfreemap.org/styles/liberty';
  private map?: maplibregl.Map;
  private requestId = 0;
  private layoutObserver?: ResizeObserver;
  private layoutResizeFrame?: number;
  @ViewChild('explorerRoot') explorerRoot!: ElementRef<HTMLElement>;
  @ViewChild('lowerPanels') lowerPanels!: ElementRef<HTMLElement>;

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
  readonly childColDef: ColDef = { sortable: true, filter: true, resizable: true, floatingFilter: false };
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
    { field: 'source_column', headerName: 'Excel', width: 125, valueFormatter: p => ({ G: 'Hauptprojekte (G)', N: 'PROVIS 322 (N)', O: 'PROVIS 328 (O)' } as any)[p.value] || p.value, cellStyle: { color: '#1466b6', fontWeight: 'bold' } },
    { field: 'reference_number', headerName: 'Referenz', width: 160 },
    { field: 'match_status', headerName: 'Treffer', width: 110 },
    { field: 'projekt_nr', headerName: 'PROVIS-Nr.', width: 150 },
    { field: 'provis_name', headerName: 'Projektname', minWidth: 140 },
    { field: 'bis_nr', headerName: 'BIS', width: 110 },
    { field: 'provis_status', headerName: 'Status', width: 148, valueFormatter: p => this.statusName(p.value) },
    { field: 'match_kind', headerName: 'Zuordnung', width: 125, valueFormatter: p => p.value === 'SUBPROJECT' ? 'Teilprojekt' : p.value === 'EXACT' ? 'Exakt' : '—' },
    { field: 'kreditsumme', headerName: 'Kredit CHF', width: 155, valueFormatter: p => this.money(p.value) },
    { field: 'geojson', headerName: 'Punkte', width: 100, valueFormatter: p => p.value ? 'Vorhanden' : 'Keine' }
  ];
  readonly needColumns: ColDef[] = [
    { field: 'name', headerName: 'Bedarf', flex: 1 },
    { field: 'status', headerName: 'Status', width: 190, valueFormatter: p => this.statusName(p.value) },
    { field: 'activityrelationtype', headerName: 'Relation', width: 180, valueFormatter: p => p.value === 'assignedneed' ? 'Zugewiesener Bedarf' : p.value === 'relatedneed' ? 'Verknüpfter Bedarf' : (p.value || '—') },
    { field: 'is_primary', headerName: 'Primär', width: 100 }
  ];
  readonly compareColumns: ColDef[] = [
    { field: 'attribute', headerName: 'Attribut', minWidth: 155, flex: 1, tooltipField: 'attribute', cellStyle: { fontWeight: 'bold' } },
    { field: 'excel', headerName: 'Excel', minWidth: 125, flex: 1, tooltipField: 'excel', valueFormatter: p => p.value === null || p.value === undefined || p.value === '' ? '—' : String(p.value) },
    { field: 'wikis', headerName: 'WiKIS', minWidth: 125, flex: 1, tooltipField: 'wikis', valueFormatter: p => p.value === null || p.value === undefined || p.value === '' ? '—' : String(p.value) },
    { field: 'provis', headerName: 'PROVIS', minWidth: 135, flex: 1, tooltipField: 'provis', valueFormatter: p => p.value === null || p.value === undefined || p.value === '' ? '—' : String(p.value) },
    { field: 'pdb', headerName: 'PDB', minWidth: 135, flex: 1, tooltipField: 'pdb', valueFormatter: p => p.value === null || p.value === undefined || p.value === '' ? '—' : String(p.value) }
  ];
  readonly costColumns: ColDef[] = [
    { field: 'project_type', headerName: 'Kostentyp', flex: 1 },
    { field: 'erp_number', headerName: 'ERP-Nr.', width: 155 },
    { field: 'costs', headerName: 'Kosten CHF', width: 160, valueFormatter: p => this.money(p.value) },
    { field: 'costs_comment', headerName: 'Bemerkung', flex: 1 }
  ];

  constructor(private explorer: ProvisExplorerService) {}

  ngAfterViewInit(): void {    
    this.layoutObserver = new ResizeObserver(() => this.scheduleLayoutResize());
    const root = this.explorerRoot.nativeElement;
    this.layoutObserver.observe(root);
    if (root.parentElement) this.layoutObserver.observe(root.parentElement);
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
      this.map.addSource('need-shapes', { type: 'geojson', data: this.emptyFeatures() });
      this.map.addSource('selected-need', { type: 'geojson', data: this.emptyFeatures() });
      this.map.addLayer({ id: 'wikis-polygon', type: 'fill', source: 'wikis-shape', paint: { 'fill-color': '#1676a3', 'fill-opacity': 0.23 } });
      this.map.addLayer({ id: 'wikis-outline', type: 'line', source: 'wikis-shape', paint: { 'line-color': '#036798', 'line-width': 3 } });
      this.map.addLayer({ id: 'provis-circles', type: 'circle', source: 'provis-points', paint: {
        'circle-radius': 7, 'circle-color': '#ec742e', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff'
      } });
      this.map.addLayer({ id: 'need-polygons', type: 'fill', source: 'need-shapes', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#269657', 'fill-opacity': 0.22 } });
      this.map.addLayer({ id: 'need-lines', type: 'line', source: 'need-shapes', paint: { 'line-color': '#269657', 'line-width': 2 } });
      this.map.addLayer({ id: 'need-points', type: 'circle', source: 'need-shapes', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': '#269657', 'circle-radius': 6 } });
      this.map.addLayer({ id: 'selected-need-fill', type: 'fill', source: 'selected-need', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#e12b60', 'fill-opacity': 0.4 } });
      this.map.addLayer({ id: 'selected-need-line', type: 'line', source: 'selected-need', paint: { 'line-color': '#e12b60', 'line-width': 5 } });
      this.map.addLayer({ id: 'selected-need-point', type: 'circle', source: 'selected-need', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': '#e12b60', 'circle-radius': 9, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
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
    setTimeout(() => this.scheduleLayoutResize(), 0);
  }

  ngOnDestroy(): void {
    ++this.requestId;
    this.layoutObserver?.disconnect();
    if (this.layoutResizeFrame !== undefined) cancelAnimationFrame(this.layoutResizeFrame);
    this.map?.remove();
  }
  private scheduleLayoutResize(): void {
    if (this.layoutResizeFrame !== undefined) cancelAnimationFrame(this.layoutResizeFrame);
    this.layoutResizeFrame = requestAnimationFrame(() => {
      this.layoutResizeFrame = undefined;
      this.updateExplorerHeight();
      this.map?.resize();
    });
  }
  private updateExplorerHeight(): void {
    const root = this.explorerRoot?.nativeElement;
    if (!root) return;
    // Fill the available viewport below the routed view's actual top edge.
    const availableHeight = Math.max(450, window.innerHeight - root.getBoundingClientRect().top);
    const headerHeight = root.querySelector('.explorer-header')?.getBoundingClientRect().height || 48;
    const loadingHeight = root.querySelector('mat-progress-bar')?.getBoundingClientRect().height || 0;
    // Allow the lower resize handle to extend the page when requested.
    const requiredHeight = headerHeight + loadingHeight + this.topPanelHeight + this.lowerPanelMinHeight + 65;
    const target = Math.ceil(Math.max(availableHeight, requiredHeight));
    if (this.explorerHeight !== target) this.explorerHeight = target;
  }
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
    this.selectedNeedUuid = null;
    this.detail = undefined;
    this.isDetailLoading = true;
    this.error = '';
    this.updateMap();
    const requestId = ++this.requestId;
    this.explorer.detail(activity.uuid).subscribe({
      next: d => { if (requestId !== this.requestId) { return; } this.detail = d; this.isDetailLoading = false; this.updateMap(true); },
      error: () => { if (requestId === this.requestId) { this.isDetailLoading = false; this.error = 'Detaildaten konnten nicht geladen werden.'; } }
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
    const pdb = this.detail.pdb?.[0];
    const pdbProjectId = i.pdb_project_id != null ? String(i.pdb_project_id) : '';
    const pdbDescription = pdb ? [
      pdb.projektbezeichnung ? 'Projektbezeichnung: ' + pdb.projektbezeichnung : '',
      pdb.projektbereich ? 'Projektbereich: ' + pdb.projektbereich : '',
      pdb.projektobjekt ? 'Projektobjekt: ' + pdb.projektobjekt : '',
      pdb.verkehrsbehinderung ? 'Verkehrsbehinderung: ' + pdb.verkehrsbehinderung : '',
      pdb.statusbezeichnung ? 'Status: ' + pdb.statusbezeichnung : '',
      pdb.projektbemerkung ? 'Projektbemerkung: ' + pdb.projektbemerkung : '',
      pdb.massnahmen ? 'Massnahmen: ' + pdb.massnahmen : ''
    ].filter(Boolean).join(' | ') : '';
    return [
      { attribute: 'Beschreibung', excel: '', wikis: a.description, provis: '', pdb: pdbDescription },
      { attribute: 'PDB-Projekt', excel: pdbProjectId, wikis: a.pdb_fid, provis: '', pdb: pdb?.projekt_id },
      { attribute: 'Titel', excel: i.excel_title, wikis: a.name, provis: this.detail.provis.filter(x => x.provis_name).map(x => x.provis_name).join(' | ') },
      { attribute: 'Status', excel: i.excel_status, wikis: this.statusName(a.status), provis: this.detail.provis.filter(x => x.provis_status).map(x => this.statusName(x.provis_status)).join(' | ') },
      { attribute: 'Hauptprojekt (G)', excel: i.provis_g, wikis: a.erp_number, provis: this.detail.provis.filter(x => x.source_column === 'G').map(x => x.projekt_nr).join(' | ') },
      { attribute: 'Projekt 322 (N)', excel: i.provis_n, wikis: '', provis: this.detail.provis.filter(x => x.source_column === 'N').map(x => x.projekt_nr).join(' | ') },
      { attribute: 'Projekt 328 (O)', excel: i.provis_o, wikis: '', provis: this.detail.provis.filter(x => x.source_column === 'O').map(x => x.projekt_nr).join(' | ') },
      { attribute: 'Dokument-Link', excel: i.excel_url, wikis: a.url, provis: '' },
      { attribute: 'Kosten (Bauvorhaben)', excel: '', wikis: a.costs, provis: this.creditSum }
    ];
  }
  setTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'provis') setTimeout(() => this.fitProvisColumns(), 0);
  }
  onProvisGridReady(event: GridReadyEvent): void { this.provisColumnApi = event.columnApi; this.fitProvisColumns(); }
  fitProvisColumns(): void {
    if (!this.provisColumnApi) return;
    const columns = this.provisColumns.map(c => c.field).filter((f): f is string => !!f);
    this.provisColumnApi.autoSizeColumns(columns, false);
  }
  selectNeed(event: RowClickedEvent): void {
    this.selectedNeedUuid = event.data?.uuid || null;
    this.updateMap();
  }
  beginResize(event: MouseEvent, mode: 'width' | 'height' | 'lowerHeight'): void {
    event.preventDefault();
    this.resizeMode = mode;
    this.startDrag = mode === 'width' ? event.clientX : event.clientY;
    this.startSize = mode === 'width' ? this.detailWidth : mode === 'height' ? this.topPanelHeight : this.lowerPanels.nativeElement.getBoundingClientRect().height;
  }
  @HostListener('document:mousemove', ['$event'])
  onDrag(event: MouseEvent): void {
    if (!this.resizeMode) return;
    if (this.resizeMode === 'height') this.topPanelHeight = Math.max(130, Math.min(680, this.startSize + event.clientY - this.startDrag));
    else if (this.resizeMode === 'lowerHeight') {
      this.lowerPanelMinHeight = Math.max(260, Math.min(1200, this.startSize + event.clientY - this.startDrag));
    } else {
      const parent = this.mapContainer?.nativeElement.closest('.lower');
      if (parent) this.detailWidth = Math.max(25, Math.min(70, this.startSize + (event.clientX - this.startDrag) * 100 / parent.clientWidth));
    }
    this.updateExplorerHeight();
    this.scheduleLayoutResize();
  }
  @HostListener('document:mouseup')
  stopDrag(): void {
    if (!this.resizeMode) return;
    this.resizeMode = null;
    this.map?.resize();
    this.fitProvisColumns();
  }
  @HostListener('window:resize')
  onWindowResize(): void { this.scheduleLayoutResize(); }

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
    for (const id of ['need-polygons', 'need-lines', 'need-points', 'selected-need-fill', 'selected-need-line', 'selected-need-point']) { this.map.setLayoutProperty(id, 'visibility', this.showNeeds ? 'visible' : 'none'); }
  }
  private emptyFeatures(): any { return { type: 'FeatureCollection', features: [] }; }
  private updateMap(fit = false): void {
    if (!this.map?.isStyleLoaded()) { return; }
    const shape: any[] = [], points: any[] = [], needs: any[] = [], selectedNeed: any[] = [];
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
    for (const need of this.detail?.needs || []) {
      if (need.geojson) {
        addFeatures(need.geojson, needs, 'Bedarf: ' + need.name);
        if (need.uuid === this.selectedNeedUuid) addFeatures(need.geojson, selectedNeed, 'Ausgewählter Bedarf: ' + need.name);
      }
    }
    (this.map.getSource('need-shapes') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: needs } as any);
    (this.map.getSource('selected-need') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: selectedNeed } as any);
    (this.map.getSource('wikis-shape') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: shape } as any);
    (this.map.getSource('provis-points') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: points } as any);
    this.setLayers();
    if (fit && shape.length + points.length + needs.length) {
      const bounds = new maplibregl.LngLatBounds();
      const visit = (coordinates: any): void => {
        if (!Array.isArray(coordinates)) { return; }
        if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') bounds.extend([coordinates[0], coordinates[1]]);
        else for (const child of coordinates) visit(child);
      };
      for (const f of [...shape, ...points, ...needs]) visit(f.geometry.coordinates);
      if (!bounds.isEmpty()) this.map.fitBounds(bounds, { padding: 65, maxZoom: 17, duration: 450 });
    }
  }
}
