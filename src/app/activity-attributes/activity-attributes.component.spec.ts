import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, LOCALE_ID } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeDeCh from '@angular/common/locales/de-CH';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// Angular Material (für ControlValueAccessor und Rendering)
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';

// Adapter & Formate
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatMomentDateModule } from '@angular/material-moment-adapter';

// Komponente
import { ActivityAttributesComponent } from './activity-attributes.component';
import { of } from 'rxjs';

// Services – Pfade analog zur Komponente
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { ManagementAreaService } from 'src/services/management-area.service';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
import { OrganisationService } from 'src/services/organisation.service';
import { AppConfigService } from 'src/services/app-config.service';
import { ConsultationService } from 'src/services/consultation.service';
import { DocumentService } from 'src/services/document.service';

// ---------- Helpers ----------
function d(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  // 12:00 verhindert DST/Timezone-Effekte im Rendering
  return new Date(y, m - 1, day, 12, 0, 0, 0);
}

function hasClassDeep(el: HTMLElement | null, cls: string): boolean {
  if (!el) return false;
  if (el.classList.contains(cls)) return true;
  const span = el.querySelector('span');
  return !!span && span.classList.contains(cls);
}

function need(
  name: string,
  orgAbbr: string,
  early: string,
  optimum: string,
  late: string,
  primary = false
) {
  return {
    properties: {
      name,
      section: '',
      isPrimary: primary,
      orderer: {
        firstName: 'Max',
        lastName: 'Muster',
        organisationalUnit: { abbreviation: orgAbbr },
      },
      finishEarlyTo: d(early),
      finishOptimumTo: d(optimum),
      finishLateTo: d(late),
      noteOfAreaManager: ''
    }
  } as any;
}

// Konsistente CH-Formate wie in der App
export const CH_DATE_FORMATS = {
  parse: { dateInput: 'DD.MM.YYYY' },
  display: {
    dateInput: 'DD.MM.YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'DD.MM.YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

// Prüft, dass ein Wert Date-ähnlich ist (oder parsebar) und inhaltlich passt
function expectDateLikeToEqual(value: any, expectedDdMmYyyy: string) {
  const adapter = TestBed.inject<DateAdapter<any>>(DateAdapter);

  const parsed = adapter.isDateInstance(value)
    ? value
    : adapter.parse(String(value), CH_DATE_FORMATS.parse.dateInput);

  expect(adapter.isDateInstance(parsed))
    .withContext('Wert ist kein Date-ähnliches Objekt nach Parsing')
    .toBeTrue();

  expect(adapter.isValid(parsed))
    .withContext('Parsed Date ist ungültig')
    .toBeTrue();

  const formatted = adapter.format(parsed, CH_DATE_FORMATS.display.dateInput);
  expect(formatted)
    .withContext(`Sollte ${expectedDdMmYyyy} sein`)
    .toBe(expectedDdMmYyyy);
}

registerLocaleData(localeDeCh);

describe('ActivityAttributesComponent – Farblogik in MatTable', () => {
  let fixture: ComponentFixture<ActivityAttributesComponent>;
  let component: ActivityAttributesComponent;

  // ---- Mocks ----
  const activatedRouteMock = { params: of({ id: 'x' }), queryParams: of({}) };

  const roadWorkActivityServiceMock = {
    getProjectTypes: () => of([]),
    getRoadWorkActivities: () => of([]),
    addRoadworkActivity: () => of({ errorMessage: '' }),
    updateRoadWorkActivity: () => of({ errorMessage: '' }),
    registerTrafficManager: () => of({ errorMessage: '' }),
    deleteRoadWorkActivity: () => of({ errorMessage: '' }),
  };

  const needsOfActivityServiceMock = {
    assignedRoadWorkNeeds: [] as any[],
    nonAssignedRoadWorkNeeds: [] as any[],
    registeredRoadWorkNeeds: [] as any[],
    assignedRoadWorkNeedsWithDocuments: [] as any[],
    updateIntersectingRoadWorkNeeds: (_: string) => { }
  };

  const managementAreaServiceMock = { getIntersectingManagementArea: () => of(null) };
  const roadWorkNeedServiceMock = {
    getRoadWorkNeeds: () => of([]),
    updateRoadWorkNeed: () => of({ errorMessage: '' }),
  };
  const userServiceMock = {
    getAllUsers: () => of([]),
    getUserFromDB: (_: string) => of([{ errorMessage: '' }]),
    getLocalUser: () => ({ mailAddress: 'test@example.com', chosenRole: 'administrator' }),
  };
  const organisationServiceMock = { getAllOrgTypes: () => of([{ errorMessage: '' }]) };
  const appConfigServiceMock = { getConfigurationData: () => of({ errorMessage: '' }) };
  const consultationServiceMock = {};
  const routerMock = { navigate: (_: any[]) => { } };
  const snackBarMock = { open: (_: string) => { } };
  const documentServiceMock = {
    uploadDocument: () => of({ errorMessage: '' }),
    getDocument: () => of(new Blob()),
    deleteDocument: () => of({}),
  };
  const dialogMock = { open: (_: any, __?: any) => { } };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,

        HttpClientTestingModule,
        RouterTestingModule,

        // Material
        MatTableModule,
        MatTabsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatMomentDateModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatTooltipModule,

        NoopAnimationsModule,
      ],
      declarations: [ActivityAttributesComponent],
      providers: [
        { provide: LOCALE_ID, useValue: 'de-CH' },
        { provide: MAT_DATE_LOCALE, useValue: 'de-CH' },
        { provide: MAT_DATE_FORMATS, useValue: CH_DATE_FORMATS },

        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: RoadWorkActivityService, useValue: roadWorkActivityServiceMock },
        { provide: NeedsOfActivityService, useValue: needsOfActivityServiceMock },
        { provide: ManagementAreaService, useValue: managementAreaServiceMock },
        { provide: RoadWorkNeedService, useValue: roadWorkNeedServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: OrganisationService, useValue: organisationServiceMock },
        { provide: AppConfigService, useValue: appConfigServiceMock },
        { provide: ConsultationService, useValue: consultationServiceMock },
        { provide: DocumentService, useValue: documentServiceMock },
      ],
      // Wir ignorieren zusätzliche Child-Komponenten, die hier nicht getestet werden
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityAttributesComponent);
    component = fixture.componentInstance;

    // 1) Erstes detectChanges -> löst ngOnInit() aus (und leert die Arrays)
    fixture.detectChanges();
    await fixture.whenStable();

    // 2) Jetzt Testdaten setzen (werden nicht von ngOnInit überschrieben)
    const primary = need('Auslösend', 'TBA', '2026-10-01', '2027-10-01', '2029-10-01', true);
    const aew = need('Bedarf AEW', 'AEW', '2026-10-01', '2027-10-01', '2029-10-01');
    const ec = need('Bedarf EC', 'EC', '2029-02-01', '2029-02-01', '2031-10-31');
    const kuba = need('Bedarf KuBa', 'KuBa', '2027-03-31', '2028-03-31', '2031-03-31');
    const apk = need('Bedarf APK', 'APK', '2027-07-01', '2027-04-01', '2028-10-01');

    (component as any).needsOfActivityService = needsOfActivityServiceMock;
    needsOfActivityServiceMock.assignedRoadWorkNeeds = [primary, aew, ec, kuba, apk];

    component.roadWorkActivityFeature = {
      properties: {
        uuid: 'u1',
        name: 'BV Test',
        isEditingAllowed: true,
        isPrivate: false,
        status: 'review',
        startOfConstruction: d('2026-10-01'),
        endOfConstruction: d('2030-01-01'),
        involvedUsers: [],
        roadWorkNeedsUuids: [],
      }
    } as any;

    component.currentUser = { prefTableView: true } as any;
    component.selectedTabIndex = 1;           // "Stammdaten"
    component.selectedStammdatenTabIndex = 5; // "Zeitfaktor"

    // 3) Zweites detectChanges -> rendert Tabelle mit Daten
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // 4) Inneren Tab wirklich aktivieren (falls Template Tabs rendert)
    await selectInnerTab('Zeitfaktor');
    await fixture.whenStable();
    fixture.detectChanges();

  });

  // ---------- Tab-Helfer ----------
  async function selectInnerTab(label: string) {
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.mat-tab-label-content')
    ) as HTMLElement[];
    const target = labels.find(el => (el.textContent || '').trim() === label);
    if (target && target.parentElement) {
      (target.parentElement as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();   // Rendering der Tab-Contents abwarten
      fixture.detectChanges();
    }
  }

  // ---------- DOM-Helfer ----------
  function findRowByText(needle: string): HTMLElement | null {
    const rows = fixture.nativeElement.querySelectorAll(
      // legacy + MDC + Fallback
      'mat-row, tr.mat-row, tr.mdc-data-table__row, table tbody tr'
    );
    const want = needle.replace(/\s+/g, ' ').trim();
    for (const r of Array.from(rows) as HTMLElement[]) {
      const got = (r.textContent || '').replace(/\s+/g, ' ').trim();
      if (got.includes(want)) return r;
    }
    return null;
  }

  function getCellInRow(rowEl: HTMLElement, column: string): HTMLElement | null {
    // erst span im Ziel-Cell, sonst Cell selbst
    return (
      rowEl.querySelector(`mat-cell.mat-column-${column} span`) ||
      rowEl.querySelector(`td.mat-column-${column} span`) ||
      rowEl.querySelector(`mat-cell.mat-column-${column}`) ||
      rowEl.querySelector(`td.mat-column-${column}`) ||
      rowEl.querySelector(`td.mat-mdc-column-${column} span`) ||
      rowEl.querySelector(`td.mat-mdc-column-${column}`)
    ) as HTMLElement | null;
  }

  function hasBorderDeep(cell: HTMLElement | null): boolean {
    if (!cell) return false;
    if (cell.classList.contains('border')) return true;
    const span = cell.querySelector('span');
    return !!span && span.classList.contains('border');
  }

  function getColumnCells(column: string): HTMLElement[] {
    // Unterstützt Legacy- und MDC-Tabellen sowie <mat-cell>
    const nodes = fixture.nativeElement.querySelectorAll(
      `td.mat-column-${column} span,
     td.mat-mdc-column-${column} span,
     td.mat-column-${column},
     td.mat-mdc-column-${column},
     mat-cell.mat-column-${column} span,
     mat-cell.mat-column-${column}`
    );
    return Array.from(nodes) as HTMLElement[];
  }

  function getInputByLabelText(labelText: string): HTMLInputElement | null {
    const fields = fixture.nativeElement.querySelectorAll('mat-form-field');
    for (const f of Array.from(fields) as HTMLElement[]) {
      const lbl = f.querySelector('mat-label');
      if ((lbl?.textContent || '').trim().includes(labelText)) {
        return f.querySelector('input') as HTMLInputElement | null;
      }
    }
    return null;
  }

  // ---------- Tests ----------
  it('rendert "earliest" und "wish" innerhalb des Bauzeitraums als grün (AEW/EC/KuBa/APK)', async () => {
    await selectInnerTab('Zeitfaktor');
    await fixture.whenStable();
    fixture.detectChanges();

    const cases = [
      'Bedarf AEW',
      'Bedarf EC',
      'Bedarf KuBa',
      'Bedarf APK',
    ];

    for (const name of cases) {
      const row = findRowByText(name);
      expect(row).withContext(`Zeile "${name}" nicht gefunden`).not.toBeNull();

      const earliestCell = getCellInRow(row!, 'earliest');
      const wishCell = getCellInRow(row!, 'wish');

      expect(earliestCell).withContext(`"earliest" in "${name}" fehlt`).not.toBeNull();
      expect(wishCell).withContext(`"wish" in "${name}" fehlt`).not.toBeNull();

      expect(hasClassDeep(earliestCell, 'green-date'))
        .withContext(`${name} earliest sollte grün sein`).toBeTrue();
      expect(hasClassDeep(wishCell, 'green-date'))
        .withContext(`${name} wish sollte grün sein`).toBeTrue();
    }
  });

  it('färbt "latest" rot, wenn späteste Inbetriebnahme vor Bauende liegt (AEW, APK)', async () => {
    await selectInnerTab('Zeitfaktor');
    await fixture.whenStable();
    fixture.detectChanges();

    const aewRow = findRowByText('Bedarf AEW');
    const apkRow = findRowByText('Bedarf APK');

    expect(aewRow).withContext('Zeile "Bedarf AEW" nicht gefunden').not.toBeNull();
    expect(apkRow).withContext('Zeile "Bedarf APK" nicht gefunden').not.toBeNull();

    const aewLatest = getCellInRow(aewRow!, 'latest');
    const apkLatest = getCellInRow(apkRow!, 'latest');

    expect(aewLatest).withContext('latest-Zelle in "Bedarf AEW" fehlt').not.toBeNull();
    expect(apkLatest).withContext('latest-Zelle in "Bedarf APK" fehlt').not.toBeNull();

    expect(hasClassDeep(aewLatest, 'red-date'))
      .withContext('AEW latest sollte rot sein')
      .toBeTrue();

    expect(hasClassDeep(apkLatest, 'red-date'))
      .withContext('APK latest sollte rot sein')
      .toBeTrue();
  });

  it('färbt "latest" grün, wenn späteste Inbetriebnahme >= Bauende liegt (EC, KuBa)', async () => {
    await selectInnerTab('Zeitfaktor');
    await fixture.whenStable();
    fixture.detectChanges();

    for (const name of ['Bedarf EC', 'Bedarf KuBa']) {
      const row = findRowByText(name);
      expect(row).withContext(`Zeile "${name}" nicht gefunden`).not.toBeNull();

      const latestCell = getCellInRow(row!, 'latest');
      expect(latestCell).withContext(`"latest" in "${name}" fehlt`).not.toBeNull();

      expect(hasClassDeep(latestCell, 'green-date'))
        .withContext(`${name} latest sollte grün sein`)
        .toBeTrue();
    }
  });

  it('setzt die "border"-Klasse, wenn calcTimeFactor(...) != 4 (AEW/EC/KuBa/APK) und NICHT beim Primärbedarf', async () => {
    await selectInnerTab('Zeitfaktor');
    await fixture.whenStable();
    fixture.detectChanges();

    // Positiv: Rahmen erwartet (Daten ergeben TF != 4)
    for (const name of ['Bedarf AEW', 'Bedarf EC', 'Bedarf KuBa', 'Bedarf APK']) {
      const row = findRowByText(name);
      expect(row).withContext(`Zeile "${name}" nicht gefunden`).not.toBeNull();

      const earliest = getCellInRow(row!, 'earliest');
      const wish = getCellInRow(row!, 'wish');
      const latest = getCellInRow(row!, 'latest');

      expect(earliest).withContext(`"earliest" in "${name}" fehlt`).not.toBeNull();
      expect(wish).withContext(`"wish" in "${name}" fehlt`).not.toBeNull();
      expect(latest).withContext(`"latest" in "${name}" fehlt`).not.toBeNull();

      expect(hasBorderDeep(earliest)).withContext(`Border fehlt (earliest) in "${name}"`).toBeTrue();
      expect(hasBorderDeep(wish)).withContext(`Border fehlt (wish) in "${name}"`).toBeTrue();
      expect(hasBorderDeep(latest)).withContext(`Border fehlt (latest) in "${name}"`).toBeTrue();
    }

    // Negativ: Primärbedarf (TF == 4) => KEIN Rahmen
    const primaryRow = findRowByText('Auslösend');
    if (primaryRow) {
      const earliestP = getCellInRow(primaryRow, 'earliest');
      const wishP = getCellInRow(primaryRow, 'wish');
      const latestP = getCellInRow(primaryRow, 'latest');

      if (earliestP) expect(hasBorderDeep(earliestP)).withContext('Primär earliest ohne Rahmen erwartet').toBeFalse();
      if (wishP) expect(hasBorderDeep(wishP)).withContext('Primär wish ohne Rahmen erwartet').toBeFalse();
      if (latestP) expect(hasBorderDeep(latestP)).withContext('Primär latest ohne Rahmen erwartet').toBeFalse();
    }
  });

  it('kombiniert Border + Farbe korrekt bei "latest": rot bei < Bauende (AEW, APK), grün bei ≥ Bauende (EC, KuBa)', async () => {
    await selectInnerTab('Zeitfaktor');
    await fixture.whenStable();
    fixture.detectChanges();

    // < Bauende -> rot + Border
    for (const name of ['Bedarf AEW', 'Bedarf APK']) {
      const row = findRowByText(name);
      expect(row).withContext(`Zeile "${name}" nicht gefunden`).not.toBeNull();
      const latest = getCellInRow(row!, 'latest');
      expect(latest).withContext(`"latest" in "${name}" fehlt`).not.toBeNull();

      expect(hasClassDeep(latest, 'red-date'))
        .withContext(`${name} latest sollte rot sein`).toBeTrue();
      expect(hasBorderDeep(latest))
        .withContext(`${name} latest sollte einen Rahmen haben`).toBeTrue();
    }

    // ≥ Bauende -> grün + Border
    for (const name of ['Bedarf EC', 'Bedarf KuBa']) {
      const row = findRowByText(name);
      expect(row).withContext(`Zeile "${name}" nicht gefunden`).not.toBeNull();
      const latest = getCellInRow(row!, 'latest');
      expect(latest).withContext(`"latest" in "${name}" fehlt`).not.toBeNull();

      expect(hasClassDeep(latest, 'green-date'))
        .withContext(`${name} latest sollte grün sein`).toBeTrue();
      expect(hasBorderDeep(latest))
        .withContext(`${name} latest sollte einen Rahmen haben`).toBeTrue();
    }
  });

  it('kombiniert Border + Farbe korrekt bei "earliest"/"wish" für Nicht-Primärbedarf (grün + Border)', async () => {
    await selectInnerTab('Zeitfaktor');
    await fixture.whenStable();
    fixture.detectChanges();

    for (const name of ['Bedarf AEW', 'Bedarf EC', 'Bedarf KuBa', 'Bedarf APK']) {
      const row = findRowByText(name);
      expect(row).withContext(`Zeile "${name}" nicht gefunden`).not.toBeNull();

      const earliest = getCellInRow(row!, 'earliest');
      const wish = getCellInRow(row!, 'wish');
      expect(earliest).withContext(`"earliest" in "${name}" fehlt`).not.toBeNull();
      expect(wish).withContext(`"wish" in "${name}" fehlt`).not.toBeNull();

      expect(hasClassDeep(earliest, 'green-date'))
        .withContext(`${name} earliest sollte grün sein`).toBeTrue();
      expect(hasClassDeep(wish, 'green-date'))
        .withContext(`${name} wish sollte grün sein`).toBeTrue();

      expect(hasBorderDeep(earliest))
        .withContext(`${name} earliest sollte einen Rahmen haben`).toBeTrue();
      expect(hasBorderDeep(wish))
        .withContext(`${name} wish sollte einen Rahmen haben`).toBeTrue();
    }
  });

  it('Fallback: ohne Start/Ende -> earliest/wish ohne Grün, dennoch Border; latest wird grün markiert', async () => {
    // Setup: Bauzeitraum entfernen
    component.roadWorkActivityFeature = {
      properties: {
        uuid: 'u1',
        name: 'BV Test',
        isEditingAllowed: true,
        isPrivate: false,
        status: 'review',
        startOfConstruction: undefined,
        endOfConstruction: undefined,
        involvedUsers: [],
        roadWorkNeedsUuids: [],
      }
    } as any;

    fixture.detectChanges();
    await selectInnerTab('Zeitfaktor');
    await fixture.whenStable();
    fixture.detectChanges();

    // Prüfen an einem Nicht-Primärbedarf (z.B. AEW)
    const row = findRowByText('Bedarf AEW');
    expect(row).withContext('Zeile "Bedarf AEW" nicht gefunden').not.toBeNull();

    const earliest = getCellInRow(row!, 'earliest');
    const wish = getCellInRow(row!, 'wish');
    const latest = getCellInRow(row!, 'latest');

    expect(earliest).not.toBeNull();
    expect(wish).not.toBeNull();
    expect(latest).not.toBeNull();

    // keine Grünfärbung ohne Bauzeitraum
    expect(hasClassDeep(earliest, 'green-date'))
      .withContext('earliest sollte ohne Bauzeitraum NICHT grün sein').toBeFalse();
    expect(hasClassDeep(wish, 'green-date'))
      .withContext('wish sollte ohne Bauzeitraum NICHT grün sein').toBeFalse();

    // Border bleibt, weil TF ≠ 4
    expect(hasBorderDeep(earliest))
      .withContext('earliest sollte trotz fehlendem Bauzeitraum einen Rahmen haben').toBeTrue();
    expect(hasBorderDeep(wish))
      .withContext('wish sollte trotz fehlendem Bauzeitraum einen Rahmen haben').toBeTrue();

    expect(hasClassDeep(latest, 'red-date'))
      .withContext('latest sollte ohne Bauzeitraum NICHT rot sein').toBeFalse();
    expect(hasClassDeep(latest, 'green-date'))
      .withContext('latest sollte ohne Bauzeitraum NICHT grün sein').toBeFalse();

      // Border bleibt, weil TF != 4
    expect(hasClassDeep(latest, 'border'))
      .withContext('latest sollte einen Rahmen haben').toBeTrue();
    expect(hasBorderDeep(latest))
      .withContext('latest sollte einen Rahmen haben').toBeTrue();
  });

  it('Auslösender Bedarf unter "Zeitangaben: Bedarfserfassung" ist neutral (keine Farben/Rahmen)', async () => {
    await selectInnerTab('Zeitfaktor');
    await fixture.whenStable();
    fixture.detectChanges();

    // Karte "Zeitangaben: Bedarfserfassung" finden
    const cards = Array.from(fixture.nativeElement.querySelectorAll('mat-card')) as HTMLElement[];
    const card = cards.find(c =>
      (c.querySelector('mat-card-title')?.textContent || '').includes('Zeitangaben: Bedarfserfassung')
    );
    expect(card).withContext('Karte "Zeitangaben: Bedarfserfassung" nicht gefunden').toBeTruthy();

    // Innerhalb des Blocks die drei Werte-Spans prüfen
    const spans = Array.from(card!.querySelectorAll('mat-card-content span')) as HTMLElement[];
    expect(spans.length).withContext('Erwarte mind. 1 Datumspan im Block').toBeGreaterThan(0);

    for (const s of spans) {
      expect(s.classList.contains('green-date')).withContext('Darf nicht grün sein').toBeFalse();
      expect(s.classList.contains('red-date')).withContext('Darf nicht rot sein').toBeFalse();
      expect(s.classList.contains('border')).withContext('Darf keinen Rahmen haben').toBeFalse();
    }
  });

  it('nutzt manuell eingegebene dd.MM.yyyy-Bauzeiten für die Farb-Logik (Texteingabe)', async () => {
    await selectInnerTab('Zeitfaktor');
    await fixture.whenStable();
    fixture.detectChanges();

    // 1) "Voraussichtliches Bauende" per TIPPEINGABE setzen: 15.09.2028
    const endInput = getInputByLabelText('Voraussichtliches Bauende');
    expect(endInput)
      .withContext('Datepicker-Eingabe für "Voraussichtliches Bauende" nicht gefunden')
      .not.toBeNull();

    endInput!.value = '15.09.2028';
    endInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    endInput!.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    endInput!.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Statt instanceof Date -> parsebare & korrekte Repräsentation prüfen
    expectDateLikeToEqual(
      component.roadWorkActivityFeature!.properties.endOfConstruction,
      '15.09.2028'
    );

    // Erwartung: APK.latest (01.10.2028) >= Bauende (15.09.2028) -> grün
    let apkRow = findRowByText('Bedarf APK');
    expect(apkRow).withContext('Zeile "Bedarf APK" nicht gefunden').not.toBeNull();
    let latestCell = getCellInRow(apkRow!, 'latest');
    expect(latestCell).withContext('"latest" fehlt').not.toBeNull();
    expect(hasClassDeep(latestCell, 'green-date'))
      .withContext('latest sollte bei Bauende 15.09.2028 grün sein')
      .toBeTrue();

    // 2) Bauende erneut auf 31.10.2028 ändern
    endInput!.value = '31.10.2028';
    endInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    endInput!.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    endInput!.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expectDateLikeToEqual(
      component.roadWorkActivityFeature!.properties.endOfConstruction,
      '31.10.2028'
    );

    // Erwartung: APK.latest (01.10.2028) < Bauende (31.10.2028) -> rot
    apkRow = findRowByText('Bedarf APK');
    latestCell = getCellInRow(apkRow!, 'latest');
    expect(hasClassDeep(latestCell, 'red-date'))
      .withContext('latest sollte bei Bauende 31.10.2028 rot sein')
      .toBeTrue();
  });

});
