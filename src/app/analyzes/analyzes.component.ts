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

  apiUrl = environment.apiUrl;

  private roadWorkNeedService: RoadWorkNeedService;
  private roadWorkActivityService: RoadWorkActivityService;

  private gridApi?: GridApi;
  private chartInstance?: echarts.ECharts;
  private resizeObserver?: ResizeObserver;

  private resizeHandler = () => {
    if (this.chartInstance) {
      this.chartInstance.resize();
    }
    this.fitGridColumns();
  };

  isLoading: boolean = false;
  roadWorkActivities: RoadWorkActivityFeature[] = [];
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

  /**
   * Only the most meaningful milestone dates.
   */
  readonly MILESTONE_DEFS: Array<{ key: string; label: string; symbol: string }> = [
    { key: 'dateSks', label: 'SKS', symbol: 'diamond' },
    { key: 'dateSksReal', label: 'SKS genehmigt', symbol: 'circle' },
    { key: 'dateKap', label: 'KAP', symbol: 'triangle' },
    { key: 'dateKapReal', label: 'KAP genehmigt', symbol: 'rect' },
    { key: 'dateOks', label: 'OKS', symbol: 'pin' },
    { key: 'dateOksReal', label: 'OKS genehmigt', symbol: 'roundRect' },
    { key: 'dateGlTba', label: 'GL-TBA', symbol: 'diamond' },
    { key: 'dateGlTbaReal', label: 'GL-TBA genehmigt', symbol: 'circle' },
    { key: 'dateOfAcceptance', label: 'Abnahmedatum', symbol: 'triangle' }
  ];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
    minWidth: 90
  };

  roadworkActivitiesColDefs: ColDef[] = [
    {
      headerName: 'BV-Nr',
      flex: 0.9,
      minWidth: 70,
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
      headerName: 'Status',
      flex: 1.2,
      minWidth: 110,
      valueGetter: params => this.getStatusLabelFromRaw(params.data?.properties?.status),
      filterValueGetter: params => this.getStatusLabelFromRaw(params.data?.properties?.status)
    },
    {
      headerName: 'Typ',
      flex: 1.0,
      minWidth: 90,
      valueGetter: params => this.translateProjectType(params.data?.properties?.projectType),
      filterValueGetter: params => this.translateProjectType(params.data?.properties?.projectType)
    },
    {
      headerName: 'Art',
      flex: 1.6,
      minWidth: 150,
      valueGetter: params => this.translateProjectKind(params.data?.properties?.projectKind),
      filterValueGetter: params => this.translateProjectKind(params.data?.properties?.projectKind)
    },
    {
      headerName: 'SKS Nr',
      flex: 0.8,
      minWidth: 80,
      valueGetter: params => params.data?.properties?.sksNo ?? ''
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
      headerName: 'SKS',
      flex: 0.9,
      minWidth: 90,
      valueGetter: params => this.formatDate(params.data?.properties?.dateSks),
      comparator: (valueA, valueB, nodeA, nodeB) => {
        const a = this.toTimestamp(nodeA?.data?.properties?.dateSks);
        const b = this.toTimestamp(nodeB?.data?.properties?.dateSks);
        return a - b;
      }
    },
    {
      headerName: 'KAP',
      flex: 0.9,
      minWidth: 90,
      valueGetter: params => this.formatDate(params.data?.properties?.dateKap),
      comparator: (valueA, valueB, nodeA, nodeB) => {
        const a = this.toTimestamp(nodeA?.data?.properties?.dateKap);
        const b = this.toTimestamp(nodeB?.data?.properties?.dateKap);
        return a - b;
      }
    },
    {
      headerName: 'OKS',
      flex: 0.9,
      minWidth: 90,
      valueGetter: params => this.formatDate(params.data?.properties?.dateOks),
      comparator: (valueA, valueB, nodeA, nodeB) => {
        const a = this.toTimestamp(nodeA?.data?.properties?.dateOks);
        const b = this.toTimestamp(nodeB?.data?.properties?.dateOks);
        return a - b;
      }
    },
    {
      headerName: 'GL-TBA',
      flex: 0.95,
      minWidth: 95,
      valueGetter: params => this.formatDate(params.data?.properties?.dateGlTba),
      comparator: (valueA, valueB, nodeA, nodeB) => {
        const a = this.toTimestamp(nodeA?.data?.properties?.dateGlTba);
        const b = this.toTimestamp(nodeB?.data?.properties?.dateGlTba);
        return a - b;
      }
    },
    {
      headerName: 'Abnahme',
      flex: 0.95,
      minWidth: 95,
      valueGetter: params => this.formatDate(params.data?.properties?.dateOfAcceptance),
      comparator: (valueA, valueB, nodeA, nodeB) => {
        const a = this.toTimestamp(nodeA?.data?.properties?.dateOfAcceptance);
        const b = this.toTimestamp(nodeB?.data?.properties?.dateOfAcceptance);
        return a - b;
      }
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
    roadWorkActivityService: RoadWorkActivityService
  ) {
    this.roadWorkNeedService = roadWorkNeedService;
    this.roadWorkActivityService = roadWorkActivityService;
  }

  ngOnInit(): void {
    this.loadRoadWorkActivities();
  }

  ngAfterViewInit(): void {
    this.initChart();
    window.addEventListener('resize', this.resizeHandler);

    if (this.gridContainerRef?.nativeElement && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.fitGridColumns();
      });
      this.resizeObserver.observe(this.gridContainerRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);

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

  loadRoadWorkActivities(): void {
    this.isLoading = true;

    this.roadWorkActivityService.getRoadWorkActivities().subscribe({
      next: (data: RoadWorkActivityFeature[]) => {
        this.roadWorkActivities = (data ?? []).filter(item => !!item?.properties);

        if (this.gridApi) {
          this.gridApi.setRowData(this.roadWorkActivities);
          this.fitGridColumns();
        }

        this.selectedProject = undefined;
        this.syncChartWithGridState();
        this.isLoading = false;
      },
      error: (_error) => {
        this.roadWorkActivities = [];
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
   * Fit columns to the available grid width.
   */
  private fitGridColumns(): void {
    if (!this.gridApi) {
      return;
    }

    setTimeout(() => {
      try {
        this.gridApi?.sizeColumnsToFit();
      } catch {
        // ignore transient sizing errors during layout changes
      }
    }, 0);
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
      return [...this.roadWorkActivities];
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
            props.isSksRelevant === true ? 'Ja' : 'Nein',
            this.getDurationDays(props.startOfConstruction, props.endOfConstruction)
          ],
          itemStyle: {
            color: this.withAlpha(color, 0.46),
            borderColor: color,
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
              r: 3
            },
            style: api.style({
              fill: this.withAlpha(color, 0.46),
              stroke: color,
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

    const milestoneSeries = this.buildMilestoneSeries(validProjects, categories);

    const today = new Date();
    const todayTimestamp = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();

    const legendData = [
      ...this.STATUS_ORDER.map(status => ({
        name: this.getStatusLabel(status),
        icon: 'roundRect',
        itemStyle: {
          color: this.withAlpha(this.getStatusColor(status), 0.46),
          borderColor: this.getStatusColor(status),
          borderWidth: 1.2
        }
      })),
      ...this.MILESTONE_DEFS.map(def => ({
        name: def.label,
        icon: def.symbol,
        itemStyle: {
          color: '#ffffff',
          borderColor: '#666',
          borderWidth: 1.6
        }
      }))
    ];

    const option: echarts.EChartsOption = {
      animation: true,
      legend: {
        selected: {
          'SKS': false,
          'SKS genehmigt': false,
          'KAP': false,
          'KAP genehmigt': false,
          'OKS': false,
          'OKS genehmigt': false,
          'GL-TBA': false,
          'GL-TBA genehmigt': false
        },
        top: 0,
        type: 'scroll',
        data: legendData as any,
        itemWidth: 18,
        itemHeight: 10
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
          restore: {},
          saveAsImage: {}
        }
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: 8,
          height: 24
        },
        {
          type: 'inside',
          xAxisIndex: 0
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
        top: 80,
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
        ...statusSeries,
        ...milestoneSeries
      ] as any[],
      graphic: [
        {
          type: 'text',
          right: 22,
          top: 56,
          style: {
            text: selectedUuid
              ? 'Ausgewähltes Projekt ist hervorgehoben'
              : 'Farben zeigen den Status',
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
        ...this.MILESTONE_DEFS.map(() => ({}))
      ]
    });
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
   * Build scatter series for meaningful milestone dates only.
   */
  private buildMilestoneSeries(
    projects: RoadWorkActivityFeature[],
    categories: string[]
  ): any[] {
    return this.MILESTONE_DEFS.map((def) => {
      const data = projects
        .map((project) => {
          const props: any = project.properties as any;
          const ts = this.toTimestamp(props[def.key]);
          if (!ts) {
            return null;
          }

          const categoryIndex = categories.indexOf(this.getProjectDisplayName(project));
          const statusKey = this.normalizeStatus(props.status);
          const statusColor = this.getStatusColor(statusKey);

          return {
            value: [ts, categoryIndex],
            name: this.getProjectDisplayName(project),
            projectName: this.getProjectDisplayName(project),
            milestoneLabel: def.label,
            date: props[def.key],
            roadWorkActivityNo: props.roadWorkActivityNo ?? '-',
            statusLabel: this.getStatusLabel(statusKey),
            itemStyle: {
              color: '#ffffff',
              borderColor: statusColor,
              borderWidth: 1.6
            },
            symbolSize: 10
          };
        })
        .filter(item => !!item);

      return {
        name: def.label,
        type: 'scatter',
        legendHoverLink: false,
        data: data,
        symbol: def.symbol,
        emphasis: {
          disabled: true
        },
        z: 20
      };
    });
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
    const props = project.properties;
    const name = props.name?.trim() || 'Ohne Name';
    const identifier =
      props.roadWorkActivityNo?.trim() ||
      props.projectNo?.trim() ||
      '-';

    return `${name} (${identifier})`;
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