/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Fachstelle Geoinformation Winterthur. All rights reserved.
 *
 * AnalyzesComponent
 * -------------------
 * Component to analyze project data
 */

import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  FilterChangedEvent,
  SortChangedEvent,
  SelectionChangedEvent
} from 'ag-grid-community';
import * as echarts from 'echarts';
import { environment } from 'src/environments/environment';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';

@Component({
  selector: 'app-analyzes',
  templateUrl: './analyzes.component.html',
  styleUrls: ['./analyzes.component.css']
})
export class AnalyzesComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('timelineChart', { static: false })
  timelineChartRef?: ElementRef<HTMLDivElement>;

  @ViewChild('gridContainer', { static: false })
  gridContainerRef?: ElementRef<HTMLDivElement>;

  @ViewChild('analysisPanels', { static: false })
  analysisPanelsRef?: ElementRef<HTMLDivElement>;

  apiUrl = environment.apiUrl;

  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;

  private gridApi?: GridApi;
  private chartInstance?: echarts.ECharts;
  private readonly ganttWheelHandler = (event: WheelEvent): void => {
    if (!this.chartInstance || !this.showChart) { return; }
    const chart = this.chartInstance;
    const options: any = chart.getOption();
    const zooms: any[] = options?.dataZoom || [];
    const zoomId = event.ctrlKey ? 'gantt-x-inside' : 'gantt-y-inside';
    const zoom = zooms.find(item => item.id === zoomId);
    if (!zoom) { return; }
    event.preventDefault();
    event.stopPropagation();
    const start = typeof zoom.start === 'number' ? zoom.start : 0;
    const end = typeof zoom.end === 'number' ? zoom.end : 100;
    const span = Math.max(0.1, end - start);
    const normalizedDelta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1);
    const factor = Math.exp(Math.max(-3, Math.min(3, normalizedDelta / 500)));
    const newSpan = Math.max(0.5, Math.min(100, span * factor));
    const elementRect = this.timelineChartRef?.nativeElement.getBoundingClientRect();
    let position = 0.5;
    if (elementRect && event.ctrlKey) {
      const gridLeft = 370;
      const gridRight = 58;
      const plotWidth = Math.max(1, elementRect.width - gridLeft - gridRight);
      position = Math.max(0, Math.min(1, (event.clientX - elementRect.left - gridLeft) / plotWidth));
    }
    const midpoint = start + span * position;
    const nextStart = Math.max(0, Math.min(100 - newSpan, midpoint - newSpan * position));
    chart.dispatchAction({
      type: 'dataZoom',
      dataZoomId: zoomId,
      start: nextStart,
      end: nextStart + newSpan
    });
  };

  private resizeObserver?: ResizeObserver;
  private chartResizeObserver?: ResizeObserver;
  private shellResizeObserver?: ResizeObserver;
  private layoutRefreshTimers: ReturnType<typeof setTimeout>[] = [];
  private panelResizeFrame?: number;
  private outerScrollContainer?: HTMLElement;
  private previousOuterOverflowY: string = '';

  gridPanelPercent: number = 32;
  showGrid: boolean = true;
  showChart: boolean = true;

  private splitterPointerMove = (event: PointerEvent): void => {
    const container = this.analysisPanelsRef?.nativeElement;
    if (!container) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    const percent = ((event.clientY - bounds.top) / bounds.height) * 100;
    this.gridPanelPercent = Math.min(70, Math.max(18, percent));
    this.schedulePanelResize();
  };

  private splitterPointerUp = (): void => {
    document.removeEventListener('pointermove', this.splitterPointerMove);
    document.removeEventListener('pointerup', this.splitterPointerUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    this.schedulePanelResize();
  };

  private resizeHandler = () => {
    this.schedulePanelResize();
  };

  private shellTransitionHandler = (): void => {
    this.schedulePanelResize();
  };

  isLoading: boolean = false;
  roadWorkActivities: RoadWorkActivityFeature[] = [];
  /** Gemeinsame Zeilenbasis: Bauvorhaben und Bedarfe. */
  timelineProjects: any[] = [];
  selectedProject?: RoadWorkActivityFeature;

  filteredProjectCount: number = 0;
  chartProjectCount: number = 0;
  missingTimelineDatesCount: number = 0;

  readonly STATUS_ORDER: string[] = [
    'coordinated',
    'incontrol1',
    'incontrol2',
    'verified',
    'suspended',
    'other'
  ];

  readonly STATUS_LABELS: { [key: string]: string } = {
    coordinated: 'Koordiniert',
    incontrol1: 'In Kontrolle 1',
    incontrol2: 'In Kontrolle 2',
    verified: 'Verifiziert',
    suspended: 'Sistiert',
    other: 'Andere'
  };

  readonly STATUS_COLORS: { [key: string]: string } = {
    coordinated: '#2e7d32',
    incontrol1: '#1976d2',
    incontrol2: '#f9a825',
    verified: '#ef6c00',
    suspended: '#1565c0',
    other: '#00897b'
  };

  /** Globale WiKIS-Farben für sämtliche Phasendarstellungen. */
  readonly PHASE_COLORS: { [key: string]: string } = {
    '1': '#93e3ff',
    '2': '#3dc3f4',
    '3': '#ff9797',
    '33': '#c00000',
    '4': '#a9d08e',
    '5': '#70ad47',
    '6': '#ed7d31'
  };

  /** Die propertyKeys sind bewusst zentral gehalten und können ans Backend angepasst werden. */
  readonly FLAG_DEFS: Array<{
    key: string;
    label: string;
    color: string;
    symbol: string;
    glyph: string;
    symbolRotate?: number;
    propertyKeys: string[];
    startKeys?: string[];
    endKeys?: string[];
  }> = [
    { key: 'prestudy', label: 'Vorstudie', color: '#ffff00', symbol: 'diamond', glyph: '◆', propertyKeys: ['isPrestudy', 'prestudy', 'isSks'] },
    { key: 'trafficOrder', label: 'Verkehrsanordnung', color: '#bfbfbf', symbol: 'circle', glyph: '●', propertyKeys: ['hasTrafficOrder', 'trafficOrder', 'isTrafficOrder'] },
    { key: 'agglomeration', label: 'Aggloprogramm', color: '#00cc00', symbol: 'triangle', glyph: '▶', symbolRotate: 90, propertyKeys: ['isAgglomerationProgram', 'agglomerationProgram'] },
    { key: 'thirdParty', label: 'Umsetzung durch Werk/Dritte', color: '#9523d2', symbol: 'circle', glyph: '●', propertyKeys: ['isThirdPartyImplementation', 'thirdPartyImplementation', 'isThirdParty', 'isUtility'] },
    { key: 'sksApproved', label: 'SKS (genehmigt)', color: '#93e3ff', symbol: 'diamond', glyph: '◆', propertyKeys: ['isSksApproved'], startKeys: ['dateSksReal'] },
    { key: 'glApproved', label: 'Genehmigter Projektierungsauftrag GL', color: '#93e3ff', symbol: 'triangle', glyph: '▲', propertyKeys: ['isGlProjectOrderApproved'], startKeys: ['dateGlTbaReal'] },
    { key: 'plan13', label: 'Planauflage (§13)', color: '#c00000', symbol: 'diamond', glyph: '◆', propertyKeys: ['isPlanPublication13'], startKeys: ['datePlanPublication13'] },
    { key: 'plan16', label: 'Planauflage (§16)', color: '#c00000', symbol: 'circle', glyph: '●', propertyKeys: ['isPlanPublication16'], startKeys: ['datePlanPublication16'] },
    { key: 'projectApproval', label: 'Projektfestsetzung', color: '#c00000', symbol: 'rect', glyph: '■', propertyKeys: ['hasProjectApproval'], startKeys: ['projectApprovalStart'], endKeys: ['projectApprovalEnd'] },
    { key: 'executionCredit', label: 'Ausführungskredit', color: '#c00000', symbol: 'path://M0,-10 L9.51,-3.09 L5.88,8.09 L-5.88,8.09 L-9.51,-3.09 Z', glyph: '⬟', propertyKeys: ['hasExecutionCredit'], startKeys: ['executionCreditStart'], endKeys: ['executionCreditEnd'] },
    { key: 'oksActive', label: 'OKS aktiv', color: '#00cc00', symbol: 'path://M0,-10 L9.51,-3.09 L5.88,8.09 L-5.88,8.09 L-9.51,-3.09 Z', glyph: '⬟', propertyKeys: ['isOksActive'], startKeys: ['dateOks'] }
  ];

  /** Wszystkie zatwierdzone flagi są zawsze widoczne na wykresie. */
  enabledFlags = new Set<string>(this.FLAG_DEFS.map(flag => flag.key));

  readonly PROJECT_KIND_LABELS: { [key: string]: string } = {
    ROAD_NEW_REGIONAL: 'Strasse Überkommunal (Neu)',
    ROAD_NEW_COMMUNAL: 'Strasse Kommunal (Neu)',
    ROAD_MAINTENANCE_REGIONAL: 'Strasse Überkommunal (Unterhalt)',
    ROAD_MAINTENANCE_COMMUNAL: 'Strasse Kommunal (Unterhalt)',
    TRENCH_WITH_RESURFACING: 'Aufgrabung mit Belagsersatz',
    WATERBODY: 'Gewässer',
    SEWER_MAINTENANCE: 'Kanalbau (Unterhalt)',
    OTHER: 'Übrige'
  };

  readonly PROJECT_TYPE_LABELS: { [key: string]: string } = {
    type_a: 'Typ A',
    type_b: 'Typ B',
    type_c: 'Typ C'
  };

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    minWidth: 110
  };

  roadworkActivitiesColDefs: ColDef[] = [
    {
      headerName: 'BV-Nr',
      flex: 0.9,
      minWidth: 90,
      valueGetter: params => params.data?.properties?.roadWorkActivityNo ?? '-'
    },
    {
      headerName: 'Projekt',
      flex: 2.4,
      minWidth: 180,
      valueGetter: params => params.data?.properties?.name ?? '-'
    },
    {
      headerName: 'Bereich',
      flex: 1.2,
      minWidth: 100,
      valueGetter: params => params.data?.properties?.section ?? ''
    },
    {
      headerName: 'Phase',
      flex: 0.8,
      minWidth: 90,
      valueGetter: params => this.getPhase(params.data),
      filterValueGetter: params => this.getPhase(params.data),
      cellStyle: params => {
        const phase = this.getPhase(params.data);
        const backgroundColor: string = this.PHASE_COLORS[phase] ?? '';
        return { backgroundColor };
      }
    },
    {
      headerName: 'Status',
      flex: 1.2,
      minWidth: 110,
      valueGetter: params => this.getStatusLabelFromRaw(params.data?.properties?.status),
      filterValueGetter: params => this.getStatusLabelFromRaw(params.data?.properties?.status)
    },
    {
      headerName: 'Gebiet',
      flex: 1.1,
      minWidth: 110,
      valueGetter: params => this.getFirstProperty(params.data, ['area', 'territory', 'district']),
      filterValueGetter: params => this.getFirstProperty(params.data, ['area', 'territory', 'district'])
    },
    {
      headerName: 'Beteiligte',
      flex: 1.4,
      minWidth: 140,
      valueGetter: params => this.getListProperty(params.data, ['participants', 'involvedParties', 'stakeholders']),
      filterValueGetter: params => this.getListProperty(params.data, ['participants', 'involvedParties', 'stakeholders'])
    },
    {
      headerName: 'Auslösende:r',
      flex: 1.2,
      minWidth: 120,
      valueGetter: params => this.getFirstProperty(params.data, ['initiator', 'triggeredBy', 'requester']),
      filterValueGetter: params => this.getFirstProperty(params.data, ['initiator', 'triggeredBy', 'requester'])
    },
    {
      headerName: 'Projekt-Art',
      flex: 1.0,
      minWidth: 120,
      valueGetter: params => this.translateProjectType(params.data?.properties?.projectType),
      filterValueGetter: params => this.translateProjectType(params.data?.properties?.projectType)
    },    
    {
      headerName: 'Baubeginn',
      flex: 1.0,
      minWidth: 95,
      valueGetter: params => this.formatDate(params.data?.properties?.startOfConstruction),
      comparator: (valueA, valueB, nodeA, nodeB) => {
        const a = this.toTimestamp(nodeA?.data?.properties?.startOfConstruction);
        const b = this.toTimestamp(nodeB?.data?.properties?.startOfConstruction);
        return a - b;
      }
    },
    {
      headerName: 'Bauende',
      flex: 1.0,
      minWidth: 95,
      valueGetter: params => this.formatDate(params.data?.properties?.endOfConstruction),
      comparator: (valueA, valueB, nodeA, nodeB) => {
        const a = this.toTimestamp(nodeA?.data?.properties?.endOfConstruction);
        const b = this.toTimestamp(nodeB?.data?.properties?.endOfConstruction);
        return a - b;
      }
    },
    {
      headerName: 'Dauer (Tage)',
      flex: 0.95,
      minWidth: 95,
      valueGetter: params => this.getDurationDaysFromProject(params.data),
      comparator: (valueA, valueB) => Number(valueA || 0) - Number(valueB || 0)
    },
    
    
    
    {
      headerName: 'Letzte Änderung',
      flex: 1.05,
      minWidth: 105,
      valueGetter: params => this.formatDate(params.data?.properties?.lastModified),
      comparator: (valueA, valueB, nodeA, nodeB) => {
        const a = this.toTimestamp(nodeA?.data?.properties?.lastModified);
        const b = this.toTimestamp(nodeB?.data?.properties?.lastModified);
        return a - b;
      }
    }
  ];

  constructor(
    roadWorkNeedService: RoadWorkNeedService,
    roadWorkActivityService: RoadWorkActivityService,
    private readonly hostElementRef: ElementRef<HTMLElement>
  ) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
  }

  ngOnInit(): void {
    this.ganttLoadSettings();
    this.loadRoadWorkActivities();
  }

  ngAfterViewInit(): void {
    this.disableOuterVerticalScroll();
    this.updateHostHeight();
    this.initChart();
    window.addEventListener('resize', this.resizeHandler);

    // Recalculate the chart when its container receives its final size.
    if (this.timelineChartRef?.nativeElement && typeof ResizeObserver !== 'undefined') {
      this.chartResizeObserver = new ResizeObserver(() => {
        if (this.showChart) {
          this.schedulePanelResize();
        }
      });
      this.chartResizeObserver.observe(this.timelineChartRef.nativeElement);
    }

    // Angular Material can finish positioning the route after the first render.
    this.schedulePanelResize();
    for (const delay of [0, 100, 300]) {
      this.layoutRefreshTimers.push(setTimeout(() => this.schedulePanelResize(), delay));
    }

    // Watch the app shell as well as the chart: router transitions do not
    // necessarily trigger a browser resize event.
    if (typeof ResizeObserver !== 'undefined') {
      this.shellResizeObserver = new ResizeObserver(() => this.schedulePanelResize());
      const parent = this.hostElementRef.nativeElement.parentElement;
      if (parent) this.shellResizeObserver.observe(parent);
      if (this.outerScrollContainer && this.outerScrollContainer !== parent) {
        this.shellResizeObserver.observe(this.outerScrollContainer);
      }
    }
    this.outerScrollContainer?.addEventListener('transitionend', this.shellTransitionHandler);

    if (this.gridContainerRef?.nativeElement && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.fitGridColumns();
      });
      this.resizeObserver.observe(this.gridContainerRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.outerScrollContainer?.removeEventListener('transitionend', this.shellTransitionHandler);
    for (const timer of this.layoutRefreshTimers) clearTimeout(timer);
    this.layoutRefreshTimers = [];
    document.removeEventListener('pointermove', this.splitterPointerMove);
    document.removeEventListener('pointerup', this.splitterPointerUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    if (this.outerScrollContainer) {
      this.outerScrollContainer.style.overflowY = this.previousOuterOverflowY;
      this.outerScrollContainer = undefined;
    }

    if (this.panelResizeFrame !== undefined) {
      cancelAnimationFrame(this.panelResizeFrame);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
    if (this.chartResizeObserver) {
      this.chartResizeObserver.disconnect();
      this.chartResizeObserver = undefined;
    }
    if (this.shellResizeObserver) {
      this.shellResizeObserver.disconnect();
      this.shellResizeObserver = undefined;
    }

    this.timelineChartRef?.nativeElement.removeEventListener('wheel', this.ganttWheelHandler, true);
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = undefined;
    }
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
    this.fitGridColumns();
    this.syncChartWithGridState();
  }

  onFilterChanged(event: FilterChangedEvent): void {
    this.syncChartWithGridState();
    this.fitGridColumns();
  }

  onSortChanged(event: SortChangedEvent): void {
    this.syncChartWithGridState();
    this.fitGridColumns();
  }

  onSelectionChanged(event?: SelectionChangedEvent): void {
    if (!this.gridApi) {
      return;
    }

    const selectedRows = this.gridApi.getSelectedRows() as RoadWorkActivityFeature[];
    this.selectedProject = selectedRows.length > 0 ? selectedRows[0] : undefined;
    this.syncChartWithGridState();
  }

  onSplitterPointerDown(event: PointerEvent): void {
    event.preventDefault();
    document.addEventListener('pointermove', this.splitterPointerMove);
    document.addEventListener('pointerup', this.splitterPointerUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }

  onSplitterKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowUp' ? -1 : 1;
    this.gridPanelPercent = Math.min(70, Math.max(18, this.gridPanelPercent + direction * 3));
    this.schedulePanelResize();
  }

  toggleGridVisibility(): void {
    if (this.showGrid && !this.showChart) {
      this.showChart = true;
    }
    this.showGrid = !this.showGrid;
    this.schedulePanelResize();
  }

  toggleChartVisibility(): void {
    if (this.showChart && !this.showGrid) {
      this.showGrid = true;
    }
    this.showChart = !this.showChart;
    this.schedulePanelResize();
  }

  private schedulePanelResize(): void {
    if (this.panelResizeFrame !== undefined) {
      cancelAnimationFrame(this.panelResizeFrame);
    }

    this.panelResizeFrame = requestAnimationFrame(() => {
      this.panelResizeFrame = undefined;
      this.updateHostHeight();
      this.chartInstance?.resize();
      (this.gridApi as any)?.doLayout?.();
    });
  }

  loadRoadWorkActivities(): void {
    this.isLoading = true;

    forkJoin({
      activities: this.roadWorkActivityService.getRoadWorkActivities(),
      needs: this.roadWorkNeedService.getRoadWorkNeeds()
    }).subscribe({
      next: ({ activities, needs }: any) => {
        this.roadWorkActivities = (activities ?? []).filter((item: any) => !!item?.properties);
        this.timelineProjects = [
          ...this.roadWorkActivities.map(item => this.tagProjectType(item, 'Bauvorhaben')),
          ...(needs ?? [])
            .filter((item: any) => !!item?.properties)
            .map((item: any) => this.tagProjectType(item, 'Bedarf'))
        ];

        if (this.gridApi) {
          this.gridApi.setRowData(this.timelineProjects);
          this.fitGridColumns();
        }

        this.selectedProject = undefined;
        this.syncChartWithGridState();
        this.isLoading = false;
        this.schedulePanelResize();
      },
      error: (_error) => {
        this.roadWorkActivities = [];
        this.timelineProjects = [];
        this.selectedProject = undefined;
        this.filteredProjectCount = 0;
        this.chartProjectCount = 0;
        this.missingTimelineDatesCount = 0;

        if (this.gridApi) {
          this.gridApi.setRowData([]);
          this.fitGridColumns();
        }

        this.renderTimeline([]);
        this.isLoading = false;
      }
    });
  }

  private initChart(): void {
    if (!this.timelineChartRef?.nativeElement) {
      return;
    }

    this.chartInstance = echarts.init(this.timelineChartRef.nativeElement);
    this.timelineChartRef.nativeElement.addEventListener('wheel', this.ganttWheelHandler, { passive: false, capture: true });
    this.chartInstance.on('datazoom', () => this.ganttOnZoom());
    this.chartInstance.on('legendselectchanged', (event: any) => {
      // Legend visibility must not change the series chosen in the date selector.
      for (const name of this.ganttSelected) {
        if (event.selected?.[name] === false) { this.ganttLegendHidden.add(name); }
        else if (event.selected?.[name] === true) { this.ganttLegendHidden.delete(name); }
      }
      this.ganttSaveSettings();
    });
    this.syncChartWithGridState();
  }

  /**
   * Use the component's real viewport position instead of assuming a fixed
   * application header height. One pixel is kept as a rounding safety margin.
   */
  private updateHostHeight(): void {
    const host = this.hostElementRef.nativeElement;
    const top = Math.max(0, host.getBoundingClientRect().top);
    const containerBottom = this.outerScrollContainer
      ? Math.min(window.innerHeight, this.outerScrollContainer.getBoundingClientRect().bottom)
      : window.innerHeight;
    const availableHeight = Math.max(1, Math.floor(containerBottom - top - 2));
    host.style.height = `${availableHeight}px`;
  }

  /**
   * The application shell can own a scrollbar (for example mat-sidenav-content),
   * so hiding overflow on the component itself is not sufficient.
   */
  private disableOuterVerticalScroll(): void {
    let element = this.hostElementRef.nativeElement.parentElement;

    while (element && element !== document.body && element !== document.documentElement) {
      const overflowY = window.getComputedStyle(element).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        this.outerScrollContainer = element;
        break;
      }
      element = element.parentElement;
    }

    if (!this.outerScrollContainer) {
      this.outerScrollContainer = (document.scrollingElement as HTMLElement) || document.documentElement;
    }

    this.previousOuterOverflowY = this.outerScrollContainer.style.overflowY;
    this.outerScrollContainer.style.overflowY = 'hidden';
  }

  /**
   * Fit columns to the available grid width.
   */
  private fitGridColumns(): void {
    // Do not call sizeColumnsToFit(): with the required number of columns it
    // makes headers unreadable. AG Grid keeps the horizontal scrollbar inside
    // the grid and respects each column's minWidth instead.
  }

  /**
   * Synchronize chart with current AG Grid state.
   */
  private syncChartWithGridState(): void {
    const rows = this.getDisplayedRowsFromGrid();

    this.filteredProjectCount = rows.length;
    this.chartProjectCount = rows.filter(row => this.hasTimelineDates(row)).length;
    this.missingTimelineDatesCount = this.filteredProjectCount - this.chartProjectCount;

    this.renderTimeline(rows);
  }

  /**
   * Return rows exactly as visible in AG Grid after filtering and sorting.
   */
  private getDisplayedRowsFromGrid(): RoadWorkActivityFeature[] {
    if (!this.gridApi) {
      return [...this.timelineProjects];
    }

    const rows: RoadWorkActivityFeature[] = [];
    this.gridApi.forEachNodeAfterFilterAndSort((node: any) => {
      if (node?.data) {
        rows.push(node.data as RoadWorkActivityFeature);
      }
    });

    return rows;
  }

  /** Selectable dates and project milestones, grouped for the legend. */
  readonly GANTT_MILESTONES: Array<{ label: string; group: string; color: string; symbol: string; keys: string[] }> = [
    { label: 'Bedarf angemeldet', group: 'Bedarf', color: '#607d8b', symbol: 'circle', keys: ['dateFrom'] },
    { label: 'Wunschtermin', group: 'Bedarf', color: '#78909c', symbol: 'diamond', keys: ['dateOptimum'] },
    { label: 'Bedarf bis', group: 'Bedarf', color: '#546e7a', symbol: 'triangle', keys: ['dateTo'] },
    { label: 'SKS', group: 'Sitzungen', color: '#93e3ff', symbol: 'diamond', keys: ['dateSksReal', 'dateSksPlanned', 'dateSks'] },
    { label: 'KAP', group: 'Sitzungen', color: '#315ac4', symbol: 'triangle', keys: ['dateKapReal', 'dateKap'] },
    { label: 'GL Auftrag', group: 'Sitzungen', color: '#93e3ff', symbol: 'triangle', keys: ['dateGlTbaReal', 'dateGlTba'] },
    { label: 'OKS', group: 'Sitzungen', color: '#00cc00', symbol: 'path://M0,-10 L9.51,-3.09 L5.88,8.09 L-5.88,8.09 L-9.51,-3.09 Z', keys: ['dateOksReal', 'dateOks'] },
    { label: 'Vorstudie Start', group: 'Vorstudie', color: '#0086ad', symbol: 'circle', keys: ['dateStudyStart'] },
    { label: 'Vorstudie Auftrag GL', group: 'Vorstudie', color: '#007396', symbol: 'diamond', keys: ['dateStudyEnd'] },
    { label: 'Vorstudie genehmigt', group: 'Vorstudie', color: '#005c82', symbol: 'pin', keys: ['studyApproved'] },
    { label: 'Bedarfsklärung 1 Ende', group: 'Koordination', color: '#cf8f23', symbol: 'diamond', keys: ['dateConsultEnd1'] },
    { label: 'Bedarfsklärung 2 Ende', group: 'Koordination', color: '#bd741c', symbol: 'triangle', keys: ['dateConsultEnd2'] },
    { label: 'Stellungnahme Ende', group: 'Koordination', color: '#a76513', symbol: 'rect', keys: ['dateReportEnd'] },
    { label: 'Planauflage (§13)', group: 'Projektierung', color: '#c00000', symbol: 'diamond', keys: ['dateParticipStart'] },
    { label: 'Planauflage (§16)', group: 'Projektierung', color: '#c00000', symbol: 'circle', keys: ['datePlanCircStart'] },
    { label: 'Projektierungsauftrag', group: 'Projektierung', color: '#a44e9d', symbol: 'pin', keys: ['dateDesignAssignmentIssued'] },
    { label: 'Projektfestsetzung', group: 'Projektierung', color: '#c00000', symbol: 'rect', keys: ['dateProjectApprovalEnd'] },
    { label: 'Ausführungskredit', group: 'Projektierung', color: '#c00000', symbol: 'path://M0,-10 L9.51,-3.09 L5.88,8.09 L-5.88,8.09 L-9.51,-3.09 Z', keys: ['dateConstructionBudgetApprovalEnd'] },
    { label: 'Submission Ende', group: 'Projektierung', color: '#9b4550', symbol: 'triangle', keys: ['dateSubmissionEnd'] },
    { label: 'Baubeginn geplant', group: 'Bauausführung', color: '#385723', symbol: 'circle', keys: ['startOfConstruction'] },
    { label: 'Baubeginn effektiv', group: 'Bauausführung', color: '#385723', symbol: 'pin', keys: ['dateStartOfConstructionReal'] },
    { label: 'Bauende geplant', group: 'Bauausführung', color: '#385723', symbol: 'circle', keys: ['endOfConstruction'] },
    { label: 'Bauende effektiv', group: 'Bauausführung', color: '#385723', symbol: 'diamond', keys: ['dateEndOfConstructionReal'] },
    { label: 'Deckbelag Ende', group: 'Bauausführung', color: '#528731', symbol: 'triangle', keys: ['dateFinalPavementEnd'] },
    { label: 'Abnahme / Garantie', group: 'Abschluss', color: '#c12e45', symbol: 'diamond', keys: ['dateGuarantee', 'dateAccept'] },
    { label: 'Projektkreditabrechnung', group: 'Abschluss', color: '#a9334b', symbol: 'rect', keys: ['dateProjectBudgetFinalized'] },
    { label: 'Aggloprogramm Termin', group: 'Abschluss', color: '#8359ba', symbol: 'pin', keys: ['aggloprogramDueDate'] }
  ];

  readonly ganttGroups: string[] = ['Bedarf', 'Sitzungen', 'Vorstudie', 'Koordination', 'Projektierung', 'Bauausführung', 'Abschluss'];
  readonly ganttVisibleChoices: number[] = [10, 15, 25, 40, 60, 100, 0];
  ganttVisibleRows = 15;
  ganttColorMode: 'period' | 'phase' = 'period';
  ganttTimePreset: 'three' | 'five' | 'seven' | 'all' | 'custom' = 'five';
  private ganttStoredXZoom: { start: number; end: number } | null = null;
  private readonly ganttSettingsKey = 'wikis.analyzes.gantt.v4';
  private ganttLegendHidden = new Set<string>();
  ganttLegendExpanded = false;
  ganttSelected = new Set<string>([
    'Projektzeitraum', 'Bauausführung', 'SKS', 'KAP', 'GL Auftrag', 'OKS',
    'Vorstudie genehmigt', 'Projektfestsetzung', 'Ausführungskredit',
    'Baubeginn effektiv', 'Bauende effektiv', 'Abnahme / Garantie'
  ]);

  ganttMilestonesInGroup(group: string): Array<{ label: string; group: string; color: string; symbol: string; keys: string[] }> {
    return this.GANTT_MILESTONES.filter(item => item.group === group);
  }

  ganttSymbolGlyph(symbol: string): string {
    if (symbol === 'diamond') { return '◆'; }
    if (symbol === 'triangle') { return '▲'; }
    if (symbol === 'rect') { return '■'; }
    if (symbol === 'pin') { return '▼'; }
    if (symbol.startsWith('path://')) { return '⬟'; }
    return '●';
  }

  ganttIsSelected(label: string): boolean { return this.ganttSelected.has(label); }

  ganttToggle(label: string, checked: boolean): void {
    if (checked) { this.ganttSelected.add(label); } else { this.ganttSelected.delete(label); }
    this.ganttLegendHidden.delete(label);
    this.ganttSaveSettings();
    this.renderTimeline(this.getDisplayedRowsFromGrid());
  }

  ganttSelectAll(select: boolean): void {
    this.ganttSelected = select
      ? new Set<string>(['Projektzeitraum', 'Bauausführung', ...this.GANTT_MILESTONES.map(item => item.label)])
      : new Set<string>();
    this.ganttLegendHidden.clear();
    this.ganttSaveSettings();
    this.renderTimeline(this.getDisplayedRowsFromGrid());
  }

  ganttSetColorMode(value: string): void {
    if (value !== 'period' && value !== 'phase') { return; }
    this.ganttColorMode = value;
    this.ganttSaveSettings();
    this.renderTimeline(this.getDisplayedRowsFromGrid());
  }

  ganttSetRowCount(value: string): void {
    this.ganttVisibleRows = Math.max(0, Number(value) || 0);
    this.ganttSaveSettings();
    this.renderTimeline(this.getDisplayedRowsFromGrid());
  }

  /** Keep chart preferences in this browser only. */
  private ganttSaveSettings(): void {
    try {
      localStorage.setItem(this.ganttSettingsKey, JSON.stringify({
        selected: Array.from(this.ganttSelected),
        legendHidden: Array.from(this.ganttLegendHidden),
        visibleRows: this.ganttVisibleRows,
        colorMode: this.ganttColorMode,
        timePreset: this.ganttTimePreset,
        xZoom: this.ganttStoredXZoom
      }));
    } catch (_error) {
      // Storage can be disabled by browser privacy settings.
    }
  }

  private ganttLoadSettings(): void {
    try {
      const raw = localStorage.getItem(this.ganttSettingsKey);
      if (!raw) { return; }
      const saved = JSON.parse(raw);
      const validNames = new Set(['Projektzeitraum', 'Bauausführung', ...this.GANTT_MILESTONES.map(item => item.label)]);
      if (Array.isArray(saved.selected)) {
        this.ganttSelected = new Set(saved.selected.filter((name: any) => typeof name === 'string' && validNames.has(name)));
      }
      this.ganttLegendHidden = new Set<string>(Array.isArray(saved.legendHidden)
        ? saved.legendHidden.filter((name: any) => typeof name === 'string' && validNames.has(name) && this.ganttSelected.has(name))
        : []);
      if (saved.colorMode === 'period' || saved.colorMode === 'phase') { this.ganttColorMode = saved.colorMode; }
      if (this.ganttVisibleChoices.includes(saved.visibleRows)) { this.ganttVisibleRows = saved.visibleRows; }
      if (['three', 'five', 'seven', 'all', 'custom'].includes(saved.timePreset)) { this.ganttTimePreset = saved.timePreset; }
      if (saved.xZoom && Number.isFinite(saved.xZoom.start) && Number.isFinite(saved.xZoom.end)) {
        this.ganttStoredXZoom = { start: saved.xZoom.start, end: saved.xZoom.end };
      }
    } catch (_error) {
      // Invalid settings should never prevent the analyses page from loading.
    }
  }

  ganttSetTimePreset(value: string): void {
    if (!['three', 'five', 'seven', 'all'].includes(value)) { return; }
    this.ganttTimePreset = value as 'three' | 'five' | 'seven' | 'all';
    this.ganttStoredXZoom = null;
    this.ganttSaveSettings();
    this.renderTimeline(this.getDisplayedRowsFromGrid());
  }

  ganttToday(): void {
    this.ganttSetTimePreset('three');
  }

  ganttShowAllDates(): void {
    this.ganttSetTimePreset('all');
  }

  ganttResetSettings(): void {
    try { localStorage.removeItem(this.ganttSettingsKey); } catch (_error) { /* Storage may be unavailable. */ }
    this.ganttLegendHidden.clear();
    this.ganttSelected = new Set([
      'Projektzeitraum', 'Bauausführung', 'SKS', 'KAP', 'GL Auftrag', 'OKS',
      'Vorstudie genehmigt', 'Projektfestsetzung', 'Ausführungskredit',
      'Baubeginn effektiv', 'Bauende effektiv', 'Abnahme / Garantie'
    ]);
    this.ganttVisibleRows = 15;
    this.ganttColorMode = 'period';
    this.ganttTimePreset = 'five';
    this.ganttStoredXZoom = null;
    this.ganttSaveSettings();
    this.renderTimeline(this.getDisplayedRowsFromGrid());
  }

  private ganttOnZoom(): void {
    if (!this.chartInstance) { return; }
    const options: any = this.chartInstance.getOption();
    const zooms: any[] = options?.dataZoom || [];
    const xZoom = zooms.find(zoom => zoom.xAxisIndex === 0 || (Array.isArray(zoom.xAxisIndex) && zoom.xAxisIndex.includes(0)));
    if (!xZoom || !Number.isFinite(xZoom.start) || !Number.isFinite(xZoom.end)) { return; }
    if (this.ganttStoredXZoom && Math.abs(this.ganttStoredXZoom.start - xZoom.start) < 0.001 && Math.abs(this.ganttStoredXZoom.end - xZoom.end) < 0.001) { return; }
    this.ganttStoredXZoom = { start: xZoom.start, end: xZoom.end };
    this.ganttTimePreset = 'custom';
    this.ganttSaveSettings();
  }

  private ganttInitialXZoom(axisMin: number, axisMax: number): { start: number; end: number } {
    if (this.ganttTimePreset === 'custom' && this.ganttStoredXZoom) { return this.ganttStoredXZoom; }
    if (this.ganttTimePreset === 'all' || axisMax <= axisMin) { return { start: 0, end: 100 }; }
    const year = new Date().getFullYear();
    const half = this.ganttTimePreset === 'three' ? 1 : this.ganttTimePreset === 'seven' ? 3 : 2;
    const from = new Date(year - half, 0, 1).getTime();
    const to = new Date(year + half + 1, 0, 1).getTime();
    const percent = (date: number) => Math.min(100, Math.max(0, ((date - axisMin) / (axisMax - axisMin)) * 100));
    const start = percent(from);
    const end = percent(to);
    return end - start >= 0.5 ? { start, end } : { start: 0, end: 100 };
  }

  /** Dates that delimit a project; system timestamps are intentionally excluded. */
  private readonly TIMELINE_DATE_FIELDS: Array<{ key: string; label: string }> = [
    { key: 'dateFrom', label: 'Bedarf ab' },
    { key: 'dateOptimum', label: 'Optimaltermin' },
    { key: 'dateTo', label: 'Bedarf bis' },
    { key: 'dateStudyStart', label: 'Vorstudie Start' },
    { key: 'dateStudyEnd', label: 'Vorstudie Ende' },
    { key: 'projectStudyApproved', label: 'Vorstudie fertig' },
    { key: 'studyApproved', label: 'Vorstudie genehmigt' },
    { key: 'dateSks', label: 'SKS' },
    { key: 'dateSksReal', label: 'SKS genehmigt' },
    { key: 'dateGlTbaReal', label: 'GL Auftrag' },
    { key: 'dateConsultStart1', label: 'Bedarfsklärung 1 Start' },
    { key: 'dateConsultEnd1', label: 'Bedarfsklärung 1 Ende' },
    { key: 'dateConsultStart2', label: 'Bedarfsklärung 2 Start' },
    { key: 'dateConsultEnd2', label: 'Bedarfsklärung 2 Ende' },
    { key: 'dateReportStart', label: 'Stellungnahme Start' },
    { key: 'dateReportEnd', label: 'Stellungnahme Ende' },
    { key: 'dateDesignAssignmentIssued', label: 'Projektierungsauftrag' },
    { key: 'dateProjectApprovalStart', label: 'Projektfestsetzung Start' },
    { key: 'dateProjectApprovalEnd', label: 'Projektfestsetzung Ende' },
    { key: 'dateConstructionBudgetApprovalStart', label: 'Ausführungskredit Start' },
    { key: 'dateConstructionBudgetApprovalEnd', label: 'Ausführungskredit Ende' },
    { key: 'dateSubmissionStart', label: 'Submission Start' },
    { key: 'dateSubmissionEnd', label: 'Submission Ende' },
    { key: 'startOfConstruction', label: 'Baubeginn geplant' },
    { key: 'endOfConstruction', label: 'Bauende geplant' },
    { key: 'dateStartOfConstructionReal', label: 'Baubeginn effektiv' },
    { key: 'dateEndOfConstructionReal', label: 'Bauende effektiv' },
    { key: 'dateFinalPavementStart', label: 'Deckbelag Start' },
    { key: 'dateFinalPavementEnd', label: 'Deckbelag Ende' },
    { key: 'dateGuarantee', label: 'Abnahme / Garantie' },
    { key: 'dateAccept', label: 'Abnahme' },
    { key: 'aggloprogramDueDate', label: 'Aggloprogramm Termin' }
  ];

  private ganttTimestamp(value: any): number {
    const timestamp = this.toTimestamp(value);
    const year = timestamp ? new Date(timestamp).getFullYear() : 0;
    return year >= 1990 && year <= 2100 ? timestamp : 0;
  }

  private getTimelineRange(project?: RoadWorkActivityFeature): { start: number; end: number; source: string; dates: Array<{label: string; value: number}> } | null {
    const props: any = project?.properties || {};
    const dates = this.TIMELINE_DATE_FIELDS
      .map(def => ({ label: def.label, value: this.ganttTimestamp(props[def.key]) }))
      .filter(item => item.value > 0);
    if (!dates.length) { return null; }
    const timestamps = dates.map(item => item.value);
    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);
    const day = 86400000;
    return { start, end: end > start ? end : start + day, source: 'Bekannte Projekttermine', dates };
  }

  private hasTimelineDates(project?: RoadWorkActivityFeature): boolean {
    return this.getTimelineRange(project) !== null;
  }

  /** Render a readable, vertically navigable Gantt chart. */
  private renderTimeline(projects: RoadWorkActivityFeature[]): void {
    if (!this.chartInstance) { return; }
    const rows = (projects || []).filter(project => this.hasTimelineDates(project));
    if (!rows.length) {
      this.chartInstance.clear();
      this.chartInstance.setOption({ title: { text: 'Keine Projekte mit fachlichen Terminen im aktuellen Filter', left: 'center', top: 'middle' } });
      return;
    }

    const labels = rows.map(project => this.getProjectDisplayName(project));
    const ranges = rows.map(project => this.getTimelineRange(project)!);
    const min = Math.min(...ranges.map(range => range.start));
    const max = Math.max(...ranges.map(range => range.end));
    const padding = Math.max(86400000 * 60, Math.round((max - min) * 0.04));
    const axisMin = min - padding;
    const axisMax = max + padding;
    const initialXZoom = this.ganttInitialXZoom(axisMin, axisMax);
    const selectedUuid = this.selectedProject?.properties?.uuid;
    const ROWS_VISIBLE = this.ganttVisibleRows === 0 ? rows.length : Math.min(this.ganttVisibleRows, rows.length);
    const needsVerticalZoom = rows.length > ROWS_VISIBLE;
    const top = 102;
    const bottom = 64;
    const gridLeft = 370;
    const gridRight = 76;

    const makeBars = (name: string, color: string, barFraction: number, z: number,
      getBounds: (props: any, range: { start: number; end: number }) => [number, number] | null) => {
      const data = rows.map((project, index) => {
        const bounds = getBounds(project.properties as any, ranges[index]);
        if (!bounds || bounds[1] < bounds[0]) { return null; }
        return {
          name: labels[index],
          value: [index, bounds[0], bounds[1]],
          projectName: labels[index],
          source: name,
          itemStyle: {
            color: name === 'Projektzeitraum' && this.ganttColorMode === 'phase'
              ? (this.getPhaseColor(project) || color)
              : color,
            opacity: 0.9
          },
          currentStatus: String(project.properties?.status || ''),
          currentPhase: this.getPhase(project)
        };
      }).filter(Boolean);
      return {
        name, type: 'custom', data, z, silent: false,
        renderItem: (_params: any, api: any) => {
          const rowIndex = api.value(0);
          const start = api.coord([api.value(1), rowIndex]);
          const end = api.coord([api.value(2), rowIndex]);
          const rowHeight = api.size([0, 1])[1];
          const height = Math.max(2, Math.min(name === 'Projektzeitraum' ? 6 : 15, rowHeight * barFraction));
          const offset = name === 'Bauausführung' ? rowHeight * 0.15 : name === 'Projektzeitraum' ? -rowHeight * 0.12 : rowHeight * 0.04;
          const shape = echarts.graphic.clipRectByRect({
            x: Math.min(start[0], end[0]),
            y: start[1] - height / 2 + offset,
            width: Math.max(2, Math.abs(end[0] - start[0])),
            height
          }, {
            x: _params.coordSys.x,
            y: _params.coordSys.y,
            width: _params.coordSys.width,
            height: _params.coordSys.height
          });
          return shape ? { type: 'rect', shape, style: api.style(), z2: z } : null;
        },
        encode: { x: [1, 2], y: 0 }
      };
    };

    const projectBar = makeBars('Projektzeitraum', '#168c93', 0.15, 2, (_props, range) => [range.start, range.end]);
    const constructionBar = makeBars('Bauausführung', '#70ad47', 0.62, 4, (props) => {
      const start = this.ganttTimestamp(props.dateStartOfConstructionReal) || this.ganttTimestamp(props.startOfConstruction);
      const end = this.ganttTimestamp(props.dateEndOfConstructionReal) || this.ganttTimestamp(props.endOfConstruction);
      return start && end ? [start, end] : null;
    });
    const milestoneSeries = this.GANTT_MILESTONES.filter(def => this.ganttSelected.has(def.label)).map(def => ({
      name: def.label,
      type: 'scatter',
      symbol: def.symbol,
      symbolSize: 12,
      z: 10,
      itemStyle: { color: def.color, borderColor: '#fff', borderWidth: 0.8 },
      data: rows.map((project, index) => {
        const props: any = project.properties || {};
        const timestamp = def.keys.map(key => this.ganttTimestamp(props[key])).find(value => value > 0);
        return timestamp ? {
          value: [timestamp, index],
          projectName: labels[index],
          milestoneLabel: def.label,
          date: timestamp,
          roadWorkActivityNo: props.roadWorkActivityNo || props.roadWorkNeedNo || '-'
        } : null;
      }).filter(Boolean)
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const option: echarts.EChartsOption = {
      animation: false,
      title: {
        text: selectedUuid ? `Projekte und Bedarfe — ${this.selectedProject?.properties?.name || ''}` : 'Projekte und Bedarfe auf der Zeitlinie',
        left: 16, top: 8,
        textStyle: { color: '#20252b', fontSize: 16 }
      },
      legend: {
        type: 'scroll', orient: 'horizontal', top: 37, left: 16, right: 72,
        itemWidth: 13, itemHeight: 10, itemGap: 17,
        textStyle: { fontSize: 11 },
        selectedMode: 'multiple',
        selected: Object.fromEntries(
          ['Projektzeitraum', 'Bauausführung', ...this.GANTT_MILESTONES.map(def => def.label)]
            .filter(name => this.ganttSelected.has(name))
            .map(name => [name, !this.ganttLegendHidden.has(name)])
        ),
        data: [
          ...(this.ganttSelected.has('Projektzeitraum') ? [{ name: 'Projektzeitraum', icon: 'roundRect' }] : []),
          ...(this.ganttSelected.has('Bauausführung') ? [{ name: 'Bauausführung', icon: 'roundRect' }] : []),
          ...this.GANTT_MILESTONES.filter(def => this.ganttSelected.has(def.label)).map(def => ({ name: def.label, icon: def.symbol }))
        ] as any
      },
      grid: { left: gridLeft, right: gridRight, top, bottom: bottom, containLabel: false },
      xAxis: {
        type: 'time', min: axisMin, max: axisMax,
        name: 'Zeit', nameLocation: 'middle', nameGap: 31,
        axisLabel: { formatter: (value: number) => new Date(value).toLocaleDateString('de-CH', { month: '2-digit', year: 'numeric' }) },
        splitLine: { show: true, lineStyle: { color: '#e6e9ed' } }
      },
      yAxis: {
        type: 'category', data: labels, inverse: true,
        axisLabel: {
          width: 320, margin: 16, overflow: 'truncate',
          formatter: (name: string, index: number) => rows[index]?.properties?.uuid === selectedUuid ? `{selected|${name}}` : name,
          rich: { selected: { backgroundColor: '#fff3bf', color: '#222', borderRadius: 3, padding: [2, 4, 2, 4] } }
        },
        axisTick: { show: false },
        splitLine: { show: true, lineStyle: { color: '#f0f2f4' } }
      },
      dataZoom: [
        {
          id: 'gantt-x-slider', type: 'slider', xAxisIndex: 0,
          bottom: 6, height: 21, filterMode: 'weakFilter',
          start: initialXZoom.start, end: initialXZoom.end
        },
        {
          id: 'gantt-x-inside', type: 'inside', xAxisIndex: 0,
          filterMode: 'weakFilter', start: initialXZoom.start, end: initialXZoom.end,
          zoomOnMouseWheel: false, moveOnMouseWheel: false
        },
        ...(needsVerticalZoom ? [{
          id: 'gantt-y-slider', type: 'slider' as const,
          yAxisIndex: 0, orient: 'vertical' as const,
          right: 10, top, bottom, width: 17,
          showDetail: false, showDataShadow: false,
          startValue: 0, endValue: Math.max(0, ROWS_VISIBLE - 1),
          filterMode: 'empty' as const,
          fillerColor: 'rgba(38, 113, 170, 0.23)',
          borderColor: '#c7d2de', handleSize: 13, moveHandleSize: 9
        }] : []),
        {
          id: 'gantt-y-inside', type: 'inside' as const,
          yAxisIndex: 0, filterMode: 'empty' as const,
          start: 0, end: needsVerticalZoom ? 100 * ROWS_VISIBLE / rows.length : 100,
          moveOnMouseWheel: false, zoomOnMouseWheel: false
        }
      ],
      tooltip: {
        trigger: 'item', confine: true,
        formatter: (params: any) => {
          const data = params.data;
          if (!data) { return ''; }
          const safe = (value: any) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          if (params.seriesType === 'scatter') {
            return `<b>${safe(data.projectName)}</b><br/>${safe(data.milestoneLabel)}: ${this.formatDate(data.date)}<br/>BV-Nr: ${safe(data.roadWorkActivityNo)}`;
          }
          const phaseInfo = data.source === 'Projektzeitraum' && this.ganttColorMode === 'phase'
            ? `<br/>Aktuelle Phase: ${safe(data.currentPhase || '-')} · Status: ${safe(data.currentStatus || '-')}`
            : '';
          return `<b>${safe(data.projectName)}</b><br/>${safe(data.source)}${phaseInfo}<br/>Start: ${this.formatDate(data.value[1])}<br/>Ende: ${this.formatDate(data.value[2])}`;
        }
      },
      series: [
        ...(this.ganttSelected.has('Projektzeitraum') ? [{ ...projectBar, markLine: {
          silent: true, symbol: ['none', 'none'],
          data: [{ xAxis: today.getTime() }],
          lineStyle: { color: '#c42d3a', width: 1.5, type: 'dashed' },
          label: { formatter: 'Heute', color: '#c42d3a', position: 'insideEndTop' }
        } }] : []),
        ...(this.ganttSelected.has('Bauausführung') ? [constructionBar] : []), ...milestoneSeries
      ] as any[]
    };
    this.chartInstance.setOption(option, true);
  }

  exportCurrentViewAsImage(): void {
    if (!this.chartInstance) {
      return;
    }
    const link = document.createElement('a');
    link.download = `mehrjahresplanung-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = this.chartInstance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
    link.click();
  }

  private buildFlagSeries(projects: RoadWorkActivityFeature[], categories: string[]): any[] {
    return this.FLAG_DEFS
      .filter(def => this.enabledFlags.has(def.key))
      .map(def => ({
        name: def.label,
        type: 'scatter',
        symbol: def.symbol,
        symbolRotate: def.symbolRotate || 0,
        symbolSize: 14,
        z: 25,
        data: projects.map(project => {
          const props: any = project.properties || {};
          const isSet = def.propertyKeys.some(key => props[key] === true);
          const start = this.getTimestampFromKeys(props, def.startKeys || []);
          const end = this.getTimestampFromKeys(props, def.endKeys || []);
          const fallback = this.toTimestamp(props.startOfConstruction);
          const timestamp = start || end || (isSet ? fallback : 0);
          if (!timestamp) {
            return null;
          }
          return {
            value: [timestamp, categories.indexOf(this.getProjectDisplayName(project))],
            projectName: this.getProjectDisplayName(project),
            milestoneLabel: def.label,
            date: timestamp,
            roadWorkActivityNo: props.roadWorkActivityNo || props.roadWorkNeedNo || '-',
            statusLabel: this.getStatusLabelFromRaw(props.status),
            itemStyle: { color: def.color }
          };
        }).filter(Boolean)
      }));
  }

  /** Data view with Swiss date formatting instead of raw ECharts timestamps. */
  private buildSwissDataView(projects: RoadWorkActivityFeature[]): HTMLElement {
    const container = document.createElement('div');
    container.style.padding = '12px';
    container.style.overflow = 'auto';

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '13px';

    const header = document.createElement('tr');
    [
      'Titel',
      'Balken Start',
      'Balken Ende',
      ...this.FLAG_DEFS.map(flag => flag.label)
    ]
      .forEach(label => {
        const cell = document.createElement('th');
        cell.textContent = label;
        cell.style.padding = '6px 8px';
        cell.style.borderBottom = '2px solid #999';
        cell.style.textAlign = 'left';
        header.appendChild(cell);
      });
    table.appendChild(header);

    projects.forEach(project => {
      const props: any = project.properties || {};
      const row = document.createElement('tr');
      const values = [
        props.name || 'Ohne Name',
        this.formatDate(this.getTimelineRange(project)?.start),
        this.formatDate(this.getTimelineRange(project)?.end),
        ...this.FLAG_DEFS.map(flag => {
          const isSet = flag.propertyKeys.some(key => props[key] === true);
          const start = this.getTimestampFromKeys(props, flag.startKeys || []);
          const end = this.getTimestampFromKeys(props, flag.endKeys || []);
          const fallback = isSet ? this.toTimestamp(props.startOfConstruction) : 0;

          if (start && end) {
            return `${this.formatDate(start)} – ${this.formatDate(end)}`;
          }

          const timestamp = start || end || fallback;
          return timestamp ? this.formatDate(timestamp) : '';
        })
      ];

      values.forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = String(value ?? '');
        cell.style.padding = '5px 8px';
        cell.style.borderBottom = '1px solid #ddd';
        row.appendChild(cell);
      });
      table.appendChild(row);
    });

    container.appendChild(table);
    return container;
  }

  /**
   * Group projects by normalized status.
   */
  private groupProjectsByStatus(projects: RoadWorkActivityFeature[]): { [status: string]: RoadWorkActivityFeature[] } {
    const result: { [status: string]: RoadWorkActivityFeature[] } = {};

    this.STATUS_ORDER.forEach(status => {
      result[status] = [];
    });

    (projects ?? []).forEach(project => {
      const status = this.normalizeStatus(project?.properties?.status);
      if (!result[status]) {
        result[status] = [];
      }
      result[status].push(project);
    });

    return result;
  }

  /**
   * Build a markArea series that highlights the full row width
   * for the selected project.
   */
  private buildSelectedRowMarkAreaSeries(
    projects: RoadWorkActivityFeature[],
    categories: string[],
    axisMin: number,
    axisMax: number,
    selectedUuid: string
  ): any[] {
    if (!selectedUuid) {
      return [];
    }

    const selectedProject = projects.find(project => project?.properties?.uuid === selectedUuid);
    if (!selectedProject) {
      return [];
    }

    const selectedCategory = this.getProjectDisplayName(selectedProject);
    if (!categories.includes(selectedCategory)) {
      return [];
    }

    return [
      {
        name: 'Auswahl',
        type: 'line',
        data: [],
        silent: true,
        showSymbol: false,
        lineStyle: {
          opacity: 0
        },
        tooltip: {
          show: false
        },
        z: 0,
        markArea: {
          silent: true,
          itemStyle: {
            color: this.getSelectedRowBackground()
          },
          data: [
            [
              { xAxis: axisMin, yAxis: selectedCategory },
              { xAxis: axisMax, yAxis: selectedCategory }
            ]
          ]
        }
      }
    ];
  }

  /**
   * Soft background color for selected row highlight.
   */
  private getSelectedRowBackground(): string {
    return 'rgba(255, 235, 59, 0.22)';
  }

  private getStatusLabel(statusKey: string): string {
    return this.STATUS_LABELS[statusKey] || this.STATUS_LABELS['other'];
  }

  private getStatusLabelFromRaw(rawStatus?: string): string {
    return this.getStatusLabel(this.normalizeStatus(rawStatus));
  }

  private translateProjectKind(value?: string): string {
    if (!value) {
      return '';
    }
    return this.PROJECT_KIND_LABELS[value] || value;
  }

  private translateProjectType(value?: string): string {
    if (!value) {
      return '';
    }
    return this.PROJECT_TYPE_LABELS[value] || value;
  }

  /**
   * Build display name for project on Y axis.
   */
  private getProjectDisplayName(project: RoadWorkActivityFeature): string {
    const props: any = project.properties;
    const name = props.name?.trim() || 'Ohne Name';
    const identifier =
      props.roadWorkActivityNo?.trim() ||
      props.roadWorkNeedNo?.trim() ||
      props.projectNo?.trim() ||
      '-';

    const kind = props.__timelineType ? ` · ${props.__timelineType}` : '';
    return `${name} (${identifier})${kind}`;
  }

  private tagProjectType(project: any, type: 'Bauvorhaben' | 'Bedarf'): any {
    return {
      ...project,
      properties: { ...project.properties}
    };
  }

  private getPhase(project: any): string {
    const status = String(project?.properties?.status || '');
    const statusPhase: { [key: string]: string } = {
      requirement: '1', review: '1', verified1: '1', verified2: '1',
      inconsult1: '1', inconsult2: '1', reporting: '1', coordinated: '1',
      planning_p1: '1', initiation_p13: '1',
      prestudy: '2', prestudy_p2: '2',
      design_p3: '3', predesign_p31: '3', design_p32: '3',
      approval_p33: '33',
      tendering_p4: '4', tendering_p41: '4',
      construction_p5: '5', executiondesign_p51: '5',
      execution_p52: '5', commissioning_p53: '5',
      operations_p6: '6', closed_p61: '6'
    };
    if (statusPhase[status]) return statusPhase[status];
    const raw = String(this.getFirstProperty(project, ['phase', 'projectPhase']) || '');
    const match = raw.match(/(?:^|\D)(33|[1-6])(?=\D|$)/);
    return match ? match[1] : '';
  }

  private getPhaseColor(project: any): string {
    return this.PHASE_COLORS[this.getPhase(project)] || '';
  }

  private getFirstProperty(project: any, keys: string[]): any {
    const props = project?.properties || {};
    for (const key of keys) {
      const value = props[key];
      if (value !== undefined && value !== null && value !== '') {
        return typeof value === 'object' ? (value.name || value.label || JSON.stringify(value)) : value;
      }
    }
    return '';
  }

  private getListProperty(project: any, keys: string[]): string {
    const value = this.getFirstProperty(project, keys);
    if (!Array.isArray(value)) {
      return String(value || '');
    }
    return value.map(item => typeof item === 'object' ? (item.name || item.label || '') : item).filter(Boolean).join(', ');
  }

  private getTimestampFromKeys(props: any, keys: string[]): number {
    for (const key of keys) {
      const timestamp = this.toTimestamp(props[key]);
      if (timestamp) {
        return timestamp;
      }
    }
    return 0;
  }

  /**
   * Normalize backend status values.
   */
  private normalizeStatus(status?: string): string {
    const s = (status ?? '').trim().toLowerCase().replace(/\s+/g, '');

    if (s.includes('coordinated') || s.includes('koordiniert') || s.includes('koord')) {
      return 'coordinated';
    }

    if (s.includes('incontrol1') || s.includes('inconsult1')) {
      return 'incontrol1';
    }

    if (s.includes('incontrol2') || s.includes('inconsult2')) {
      return 'incontrol2';
    }

    if (s.includes('verified') || s.includes('verifiziert')) {
      return 'verified';
    }

    if (s.includes('suspended') || s.includes('sistiert') || s.includes('pause') || s.includes('hold')) {
      return 'suspended';
    }

    return 'other';
  }

  /**
   * Resolve color for normalized status.
   */
  private getStatusColor(status: string): string {
    return this.STATUS_COLORS[status] || this.STATUS_COLORS['other'];
  }

  /**
   * Convert hex color to rgba string with alpha.
   */
  private withAlpha(hexColor: string, alpha: number): string {
    const hex = (hexColor || '').replace('#', '');

    if (hex.length !== 6) {
      return hexColor;
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Convert a date-like value to timestamp.
   */
  private toTimestamp(value: Date | string | undefined): number {
    if (!value) {
      return 0;
    }

    const date = new Date(value);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  /**
   * Calculate duration in days.
   */
  private getDurationDays(startValue?: Date | string, endValue?: Date | string): number {
    const start = this.toTimestamp(startValue);
    const end = this.toTimestamp(endValue);

    if (!start || !end || end < start) {
      return 0;
    }

    return Math.round((end - start) / (24 * 60 * 60 * 1000));
  }

  /**
   * Convenience method for duration column.
   */
  private getDurationDaysFromProject(project?: RoadWorkActivityFeature): number {
    if (!project?.properties) {
      return 0;
    }

    return this.getDurationDays(
      project.properties.startOfConstruction,
      project.properties.endOfConstruction
    );
  }

  /**
   * Format date for UI.
   */
  formatDate(value: Date | string | number | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('de-CH');
  }
}
