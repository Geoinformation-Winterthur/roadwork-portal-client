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
  private resizeObserver?: ResizeObserver;
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
    this.updateHostHeight();
    if (this.chartInstance) {
      this.chartInstance.resize();
    }
    this.fitGridColumns();
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
    this.loadRoadWorkActivities();
  }

  ngAfterViewInit(): void {
    this.disableOuterVerticalScroll();
    this.updateHostHeight();
    this.initChart();
    window.addEventListener('resize', this.resizeHandler);

    requestAnimationFrame(() => this.schedulePanelResize());

    if (this.gridContainerRef?.nativeElement && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.fitGridColumns();
      });
      this.resizeObserver.observe(this.gridContainerRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
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

  /**
   * Timeline requires construction start and end dates.
   */
  private hasTimelineDates(project?: RoadWorkActivityFeature): boolean {
    const props = project?.properties;
    return !!props?.startOfConstruction && !!props?.endOfConstruction;
  }

  /**
   * Render timeline chart.
   */
  private renderTimeline(projects: RoadWorkActivityFeature[]): void {
    if (!this.chartInstance) {
      return;
    }

    const validProjects = (projects ?? []).filter(project => this.hasTimelineDates(project));

    if (validProjects.length === 0) {
      this.chartInstance.clear();
      this.chartInstance.setOption({
        title: {
          text: 'Keine Projekte mit Start- und Enddatum im aktuellen Filter',
          left: 'center',
          top: 'middle',
          textStyle: {
            fontSize: 16,
            fontWeight: 'normal',
            color: '#666'
          }
        }
      });
      return;
    }

    const categories = validProjects.map(project => this.getProjectDisplayName(project));
    const selectedUuid = this.selectedProject?.properties?.uuid ?? '';

    let minProjectDate = Number.MAX_SAFE_INTEGER;
    let maxProjectDate = 0;

    const grouped = this.groupProjectsByStatus(validProjects);

    validProjects.forEach(project => {
      const startTs = this.toTimestamp(project.properties.startOfConstruction);
      const endTs = this.toTimestamp(project.properties.endOfConstruction);

      if (startTs > 0 && startTs < minProjectDate) {
        minProjectDate = startTs;
      }
      if (endTs > maxProjectDate) {
        maxProjectDate = endTs;
      }
    });

    const rawSpan = Math.max(maxProjectDate - minProjectDate, 1);
    const padding = Math.max(Math.round(rawSpan * 0.10), 24 * 60 * 60 * 1000);
    const axisMin = minProjectDate - padding;
    const axisMax = maxProjectDate + padding;

    const selectedRowMarkAreaSeries = this.buildSelectedRowMarkAreaSeries(
      validProjects,
      categories,
      axisMin,
      axisMax,
      selectedUuid
    );

    const statusSeries = this.STATUS_ORDER.map((statusKey) => {
      const color = this.getStatusColor(statusKey);
      const statusProjects = grouped[statusKey] || [];

      const data = statusProjects.map((project) => {
        const props = project.properties;
        const startTs = this.toTimestamp(props.startOfConstruction);
        const endTs = this.toTimestamp(props.endOfConstruction);
        const categoryIndex = categories.indexOf(this.getProjectDisplayName(project));
        const phaseColor = this.getPhaseColor(project) || color;

        return {
          id: props.uuid || `${statusKey}-${categoryIndex}`,
          name: this.getProjectDisplayName(project),
          value: [
            categoryIndex,
            startTs,
            endTs,
            props.roadWorkActivityNo ?? '-',
            this.getStatusLabel(statusKey),
            this.translateProjectType(props.projectType),
            this.translateProjectKind(props.projectKind),
            props.section ?? '',
            props.sksNo ?? '',
            props.isOksActive === true ? 'Ja' : 'Nein',
            this.getDurationDays(props.startOfConstruction, props.endOfConstruction)
          ],
          itemStyle: {
            color: this.withAlpha(phaseColor, 0.70),
            borderColor: phaseColor,
            borderWidth: 1.2
          }
        };
      });

      return {
        name: this.getStatusLabel(statusKey),
        type: 'custom',
        legendHoverLink: false,
        data: data,
        renderItem: (params: any, api: any) => {
          const categoryIndex = api.value(0);
          const startCoord = api.coord([api.value(1), categoryIndex]);
          const endCoord = api.coord([api.value(2), categoryIndex]);
          const barHeight = api.size([0, 1])[1] * 0.54;

          return {
            type: 'rect',
            transition: ['shape', 'style'],
            shape: {
              x: startCoord[0],
              y: startCoord[1] - barHeight / 2,
              width: Math.max(endCoord[0] - startCoord[0], 4),
              height: barHeight,
              r: 0
            },
            style: api.style({
              lineWidth: 1.2
            })
          };
        },
        encode: {
          x: [1, 2],
          y: 0
        },
        emphasis: {
          disabled: true
        },
        z: 2
      };
    });

    const flagSeries = this.buildFlagSeries(validProjects, categories);
    const phaseLegendSeries = Object.keys(this.PHASE_COLORS).map(phase => ({
      name: `Phase ${phase}`,
      type: 'scatter',
      data: [],
      symbol: 'rect',
      symbolSize: 12,
      silent: true,
      tooltip: { show: false },
      itemStyle: { color: this.PHASE_COLORS[phase] }
    }));

    const today = new Date();
    const todayTimestamp = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();

    const legendData = [
      ...Object.keys(this.PHASE_COLORS).map(phase => ({
        name: `Phase ${phase}`,
        icon: 'rect',
        itemStyle: {
          color: this.PHASE_COLORS[phase],
          borderColor: this.PHASE_COLORS[phase],
          borderWidth: 1.2
        }
      })),
      ...this.FLAG_DEFS.filter(def => this.enabledFlags.has(def.key)).map(def => ({
        name: def.label,
        icon: def.symbol,
        itemStyle: { color: def.color }
      }))
    ];

    const option: echarts.EChartsOption = {
      animation: true,
      title: {
        text: selectedUuid
          ? `Projekte und Bedarfe auf der Zeitlinie — ${this.selectedProject?.properties?.name || ''}`
          : 'Projekte und Bedarfe auf der Zeitlinie',
        left: 16,
        top: 10,
        textStyle: {
          color: '#20252b',
          fontSize: 17,
          fontWeight: 'bold'
        }
      },
      legend: {
        top: 38,
        left: 16,
        right: 100,
        type: 'plain',
        orient: 'horizontal',
        data: legendData as any,
        itemWidth: 14,
        itemHeight: 10,
        itemGap: 12,
        textStyle: {
          fontSize: 11
        }
      },
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderColor: '#ccc',
        borderWidth: 1,
        textStyle: {
          color: '#222'
        },
        formatter: (params: any) => {
          const seriesType = params.seriesType;
          const data = params.data;

          if (seriesType === 'scatter') {
            return [
              `<b>${data.projectName}</b>`,
              `${data.milestoneLabel}: ${this.formatDate(data.date)}`,
              `BV-Nr: ${data.roadWorkActivityNo || '-'}`,
              `Status: ${data.statusLabel || '-'}`
            ].join('<br/>');
          }

          const item = params.data;
          return [
            `<b>${item.name}</b>`,
            `BV-Nr: ${item.value[3] || '-'}`,
            `Status: ${item.value[4] || '-'}`,
            `Typ: ${item.value[5] || '-'}`,
            `Art: ${item.value[6] || '-'}`,
            `Bereich: ${item.value[7] || '-'}`,
            `SKS Nr: ${item.value[8] || '-'}`,
            `SKS relevant: ${item.value[9] || '-'}`,
            `Baubeginn: ${this.formatDate(item.value[1])}`,
            `Bauende: ${this.formatDate(item.value[2])}`,
            `Dauer: ${item.value[10] || 0} Tage`
          ].join('<br/>');
        }
      },
      toolbox: {
        right: 10,
        feature: {
          restore: {
            title: 'Wiederherstellen'
          },
          dataView: {
            readOnly: true,
            title: 'Datenansicht',
            lang: ['Datenansicht', 'Schliessen', 'Aktualisieren'],
            optionToContent: () => this.buildSwissDataView(validProjects)
          }
        }
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: 8,
          height: 24,
          filterMode: 'weakFilter'
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'weakFilter'
        },
        {
          type: 'slider',
          yAxisIndex: 0,
          right: 8,
          width: 16,
          filterMode: 'empty',
          showDetail: false
        },
        {
          type: 'inside',
          yAxisIndex: 0,
          filterMode: 'empty',
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
          zoomOnMouseWheel: false
        }
      ],
      grid: {
        left: 290,
        right: 60,
        top: 112,
        bottom: 60
      },
      xAxis: {
        type: 'time',
        min: axisMin,
        max: axisMax,
        name: 'Zeit',
        nameLocation: 'middle',
        nameGap: 35,
        splitLine: {
          show: true,
          lineStyle: {
            color: '#eee'
          }
        },
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return date.toLocaleDateString('de-CH', {
              year: 'numeric',
              month: '2-digit'
            });
          }
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        inverse: true,
        axisLabel: {
          width: 260,
          overflow: 'truncate',
          formatter: (value: string) => {
            const selectedName = this.selectedProject
              ? this.getProjectDisplayName(this.selectedProject)
              : '';

            if (value === selectedName) {
              return `{selected|${value}}`;
            }

            return value;
          },
          rich: {
            selected: {
              backgroundColor: 'rgba(255, 235, 59, 0.35)',
              padding: [2, 6, 2, 6],
              borderRadius: 4,
              color: '#222'
            }
          }
        }
      },
      series: [
        ...selectedRowMarkAreaSeries,
        ...phaseLegendSeries,
        ...statusSeries,
        ...flagSeries
      ] as any[],
      graphic: [
        {
          type: 'text',
          right: 22,
          top: 56,
          style: {
            text: selectedUuid
              ? 'Ausgewähltes Projekt ist hervorgehoben'
              : 'Farben zeigen die Phase',
            fill: '#666',
            font: '12px sans-serif'
          }
        }
      ]
    };

    this.chartInstance.clear();
    this.chartInstance.setOption(option, true);

    this.chartInstance.setOption({
      series: [
        ...selectedRowMarkAreaSeries.map(() => ({})),
        ...phaseLegendSeries.map(() => ({})),
        ...this.STATUS_ORDER.map(() => ({
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            label: {
              show: true,
              formatter: 'Heute',
              position: 'insideEndTop',
              color: '#b00020',
              fontWeight: 'bold'
            },
            lineStyle: {
              color: '#b00020',
              width: 2,
              type: 'dashed'
            },
            data: [
              {
                xAxis: todayTimestamp
              }
            ]
          }
        })),
        ...flagSeries.map(() => ({}))
      ]
    });
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
        this.formatDate(props.startOfConstruction),
        this.formatDate(props.endOfConstruction),
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
    const raw = this.getFirstProperty(project, ['phase', 'projectPhase']);
    const match = String(raw || '').match(/[1-6]/);
    return match ? match[0] : '';
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