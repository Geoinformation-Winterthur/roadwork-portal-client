import { Injectable } from '@angular/core';
import { ReportLoaderService } from 'src/services/report-loader.service';
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  SimpleField,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  PageOrientation,
  BorderStyle,  
  VerticalAlign,
  TextDirection,
  HeightRule,
  TabStopType,
  PageBreak
} from 'docx';
import { firstValueFrom } from 'rxjs';
import { RoadWorkNeedService } from './roadwork-need.service';
import { ConsultationService } from './consultation.service';

/** Public options for document generation. */
export interface DocxBuildOptions {
  username?: string;                                   // footer user label
  logoUrl?: string;                                    // header logo (URL/data:)
  headerSubtitle?: string;                             // small subtitle under logo
  orientation?: 'portrait' | 'landscape';              // default: portrait
  marginsCm?: { top: number; right: number; bottom: number; left: number }; // default: 2/1/2/2
  fileName?: string;
  children: Array<Paragraph | Table | string | number | null | undefined>;
}

/** Domain item used to build tables directly from data. */
export interface ChildItem {
  name: string;
  department: string;
  workArea?: string;
  isPresent: boolean;
  shouldBePresent: boolean;
  isRoadworkProject?: boolean;
}

// -------- Units & helpers ----------------------------------------------
const cmToTwips = (cm: number) => Math.round((1440 / 2.54) * cm);

// all-borders-none helper
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

// AlignmentType is a runtime enum; make a TS type out of its values
type AlignmentTypeValue = (typeof AlignmentType)[keyof typeof AlignmentType];

// clamp helper (avoid 0/NaN sizes in images)
const clamp = (n: number, min = 1, max = 10000) =>
  Math.max(min, Math.min(max, Math.round(n)));

@Injectable({ providedIn: 'root' })
export class DocxWordService {
  constructor(private reportLoaderService: ReportLoaderService,
              private roadWorkNeedService: RoadWorkNeedService,
              private consultationService: ConsultationService) {
  }

  // -------- sanitize text (remove control chars that can break XML)
  private sanitizeText(s: string) {
    return (s ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');
  }

  /** Date formatter compatible with your HTML generator. */
  private formatDate(value: Date | string | undefined | null): string {
    if (value === undefined || value === null) return '[Datum fehlt]';
    const d: Date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${d.getFullYear()}`;
  }

  /**
   * Build a DOCX blob using docx v8 APIs.
   * - Adds header (optional logo + subtitle) and footer (username + "Seite X / Y").
   * - Inserts provided children (Paragraph/Table) as main content.
   *   Any accidental strings/numbers are wrapped into a Paragraph safely.
   */
  async build(options: DocxBuildOptions): Promise<Blob> {
    const {
      username = 'wikis_manager',
      logoUrl,
      headerSubtitle = '',
      orientation = 'portrait',
      marginsCm = { top: 2, right: 1, bottom: 2, left: 2 },
      children,
    } = options;

    const isLandscape = orientation === 'landscape';

    // ---------- Header (logo + subtitle) ----------
    const headerParas: Paragraph[] = [];

    if (logoUrl) {
      const logoRun = await this.safeImageRun(logoUrl, 130, 64);
      if (logoRun) {
        headerParas.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [logoRun],
          })
        );
      }
    }   

    const header = new Header({ children: headerParas });

    // ---------- Footer ----------
    const footerTextSize = 18;
    const footerColor = "666666";    

    const footer = new Footer({
      children: [
        new Paragraph({
          // Apply unified footer style to the whole line
          style: "FooterStyle",
          children: [
            // Left-aligned text
            new TextRun({
              text: "SKS-Vor-Protokoll",
            }),                        
            new TextRun({
              text: `, Erstelldatum: ${(new Date()).toLocaleDateString()} ${(new Date()).toLocaleTimeString()}`,
            }),            
            new TextRun({ text: "\t" }),            
            new TextRun({
              text: `Seite `,
            }),            
            new TextRun({ text: "\t" }),            
            // Current page number
            new SimpleField("PAGE"),            
            new TextRun({
              text: " / ",
            }),
            // Total pages
            new SimpleField("NUMPAGES"),
          ],
          // Tab stops: left at start, right near the page margin
          tabStops: [
            {
              type: TabStopType.LEFT,
              position: 0,
            },
            {
              type: TabStopType.RIGHT,
              position: 9000, 
            },
          ],
        }),
      ],
    });


    // ---------- Normalize children (no raw strings/numbers/null/undefined) ----------
    const normalizedChildren: Array<Paragraph | Table> = (children ?? [])
      .filter((c) => c !== null && c !== undefined)
      .map((c) => {
        if (c instanceof Paragraph || c instanceof Table) return c;
        return this.p(String(c)); // wrap any stray primitives
      })
      .filter(Boolean) as Array<Paragraph | Table>;

    // ---------- Document ----------
    const doc = new Document({
        styles: {
          paragraphStyles: [
          {
            id: "FooterStyle",
            name: "Footer Style",
            basedOn: "Normal",
            run: {
              size: 18,         
              color: "666666",  
              font: "Arial",    
            },
          },
        ],
        default: {
          document: {
            run: {
              font: 'Arial', 
              size: 22,      
              color: '000000', 
            },
            paragraph: {
              spacing: { after: 120 },
            },
          },
        },
      },
      sections: [
        {
          headers: { default: header },
          footers: { default: footer },
          properties: {
            page: {
              margin: {
                top: cmToTwips(marginsCm.top),
                right: cmToTwips(marginsCm.right),
                bottom: cmToTwips(marginsCm.bottom),
                left: cmToTwips(marginsCm.left),
              },
              size: {
                orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
              },
            },
          },
          children: normalizedChildren,
        },
      ],
    });

    return Packer.toBlob(doc);
  }

  // ---------------- Content helpers (Paragraphs / Tables / Images) ----------------

  /** Create a simple paragraph. */
  p(
    text: string,
    opts?: { bold?: boolean; italic?: boolean; align?: AlignmentTypeValue; colorHex?: string; sizeHalfPt?: number, lineSpacing?: number }
  ) {
    const { bold, italic, align, colorHex, sizeHalfPt, lineSpacing } = opts || {};
    return new Paragraph({
      alignment: align,
      spacing: {
        line: lineSpacing ?? 250, 
      },
      children: [
        new TextRun({
          text: this.sanitizeText(text),
          bold: bold || undefined,
          italics: italic || undefined,
          color: colorHex,
          size: sizeHalfPt,          
        }),
      ],
    });
  }

  pChildren(children: TextRun[] | Paragraph[]): Paragraph {
    return new Paragraph({ children });
  }

  /** Convenience: bold paragraph (e.g., a section title). */
  pBold(text: string, align?: AlignmentTypeValue) {
    return this.p(text, { bold: true, align });
  }

  /** Convenience: italic paragraph */
  pItalic(text: string): Paragraph {
    const p = new Paragraph({
      children: [new TextRun({ text, italics: true })],
    });
    return p;
  }

  /** Small vertical spacer paragraph. */
  spacer(): Paragraph {
    return new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 120, after: 120 } });
  }

  /** A smaller gap for tight title→table spacing. */
  smallGap(): Paragraph {
    return new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 60, after: 60 } });
  }

  private ensureNonEmpty(rows: TableRow[], colCount: number): TableRow[] {
    if (rows.length > 0) return rows;
    return [
      new TableRow({
        children: Array.from({ length: colCount }, () =>
          new TableCell({ children: [this.p('—', { colorHex: '888888' })] })
        ),
      }),
    ];
  }

  makeInfoTable(data: { key: string; value: string }[]) {
    const rows = (data ?? []).map(
      (item) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: this.sanitizeText(item.key), bold: true })] })],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [new Paragraph({ children: [new TextRun({ text: this.sanitizeText(item.value) })] })],
            }),
          ],
        })
    );

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: this.ensureNonEmpty(rows, 2),
    });
  }

  /** Present persons (present & should be present) */
  makePresentPersonsList(children: any[]) {
    // Filter all valid and present persons
    const rowsData = (children || [])
      .filter(
        (item) =>
          item &&
          item.isRoadworkProject !== true &&
          item.isPresent === true &&
          item.shouldBePresent === true
      )
      .map((item) => ({
        Name: item.name,
        Organisation: item.department,
        Workarea: item.workArea,
      }));

    // If there are no present persons, return a single placeholder paragraph
    if (rowsData.length === 0) {
      return [this.p("—")]; // Placeholder if no data
    }

    // Create manually numbered paragraphs (1., 2., 3., ...)
    return rowsData.map((r, index) =>      
      this.p(
        `${index + 1}. ${r.Name}, ${r.Organisation}, ${r.Workarea}`
      )
    );
  }


  /** Entschuldigte Personen (not present but should be present) */
  makeExcusedPersonsList(children: any[]) {
    // Filter all valid and excused (not present but should be present) persons
    const rowsData = (children || [])
      .filter(
        (item) =>
          item &&
          item.isRoadworkProject !== true &&
          item.isPresent === false &&
          item.shouldBePresent === true
      )
      .map((item) => ({
        Name: item.name,
        Organisation: item.department,
        Workarea: item.workArea,
      }));

    // If there are no excused persons, return a single placeholder paragraph
    if (rowsData.length === 0) {
      return [this.p("—")]; // Placeholder if list is empty
    }

    // Create manually numbered paragraphs (1., 2., 3., ...)
    return rowsData.map((r, index) =>      
      this.p(
        `${index + 1}. ${r.Name}, ${r.Organisation}, ${r.Workarea}`
      )
    );
  }


  /** Verteiler (distribution list) */
  makeDistributionPersonsList(children: any[]) {
    // Filter all persons that belong to the distribution list
    const rowsData = (children || [])
      .filter(
        (item) =>
          item &&
          item.isRoadworkProject !== true &&
          item.isDistributionList === true
      )
      .map((item) => ({
        Name: item.name,
        Organisation: item.department,
        Workarea: item.workArea,
      }));

    // If list is empty, return a placeholder line
    if (rowsData.length === 0) {
      return [this.p("—")]; // Placeholder for empty list
    }

    // Create manually numbered entries (1., 2., 3., ...)
    return rowsData.map((r, index) =>
      this.p(
        `${index + 1}. ${r.Name}, ${r.Organisation}, ${r.Workarea}`
      )
    );
  }
  

  
   

  /**
   * Build an ImageRun from a URL/data URL and fit it to given content width (in px),
   * preserving aspect ratio.
   * Returns null if image cannot be decoded.
   */
  async imageFromUrlFitted(src: string, fitWidthPx: number): Promise<ImageRun | null> {
    try {
      const { bytes, mime, naturalW, naturalH } = await this.fetchImageNatural(src);
      const safeW = clamp(Math.min(naturalW || fitWidthPx, fitWidthPx), 1);
      const safeH = clamp(naturalW ? (naturalH * safeW) / naturalW : fitWidthPx, 1);
      const type = 'png';

      return new ImageRun({
        data: bytes,
        type,
        transformation: { width: safeW, height: safeH },
      });
    } catch (e) {
      console.warn('Skipping broken image:', e);
      return null;
    }
  }

  /**
   * Safe image with fixed target width/height (no aspect calc).
   * Used for header logo (we already know target size).
   */
  private async safeImageRun(src: string, widthPx: number, heightPx: number): Promise<ImageRun | null> {
    try {
      const { bytes, mime } = await this.fetchAsBytesWithMime(src);
      const type = (mime && mime.startsWith('image/')) ? (mime as any) : ('image/png' as any);
      return new ImageRun({
        data: bytes,
        type,
        transformation: { width: clamp(widthPx), height: clamp(heightPx) },
      });
    } catch (e) {
      console.warn('Skipping header image:', e);
      return null;
    }
  }

  // ---------------- Utilities (fetch, images) ----------------

  /** Fetch URL or data URL as bytes + MIME (needed by ImageRun.type). */
  private async fetchAsBytesWithMime(urlOrDataUrl: string): Promise<{ bytes: Uint8Array; mime: string }> {
    if (urlOrDataUrl.startsWith('data:')) {
      const m = urlOrDataUrl.match(/^data:(.*?);base64,(.*)$/);
      if (!m) throw new Error('Invalid data URL');
      const mime = m[1] || 'image/png';
      const bytes = this.base64ToBytes(m[2]);
      return { bytes, mime };
    }
    const res = await fetch(urlOrDataUrl);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    const blob = await res.blob();
    const ab = await blob.arrayBuffer();
    return { bytes: new Uint8Array(ab), mime: blob.type || 'image/png' };
  }

  /** Resolve natural size of an image; throws on decode error. */
  private async fetchImageNatural(src: string): Promise<{ bytes: Uint8Array; mime: string; naturalW: number; naturalH: number }> {
    const { bytes, mime } = await this.fetchAsBytesWithMime(src);
    const blob = new Blob([bytes], { type: mime || 'image/png' });
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      return { bytes, mime: mime || 'image/png', naturalW: img.naturalWidth, naturalH: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private base64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  /**
   * Prepare projects for the DOCX report.
   * For each project:
   *  - loads the activity into ReportLoaderService (stateful),
   *  - captures perimeter map,
   *  - returns meta fields (Auslösende:r, Werk, GM, Mitwirkende),
   *  - and a normalized assigned-needs row set for table rendering.
   */
  async prepareRoadWorkActivity(projects: any[]) {
    // Array to collect data for all projects
    const items: Array<{
      project: any;
      mapUrl: string;      
      meta: {
        ausloesende: string;
        ausloesendesWerk: string;
        gm: string;
        comment: string;
        mitwirkende: string;
      };
      notAssignedNeedsRows: Array<{
        titelAbschnitt: string;
        ausloesegrund: string;
        ausloesende: string;
        werk: string;
        erstelltAm: string;
        wunschtermin: string;
        ausloesend: string;
      }>;
      assignedNeedsRows: Array<{
        titelAbschnitt: string;
        ausloesegrund: string;
        ausloesende: string;
        werk: string;
        erstelltAm: string;
        wunschtermin: string;
        ausloesend: string;
      }>;
    }> = [];

    // Process each project one by one
    for (const project of projects ?? []) {
      if (!project?.isRoadworkProject) continue;
      
      try {
        // 1) Load the project context (roadWorkActivity, primaryNeed, etc.)
        await firstValueFrom(this.reportLoaderService.loadRoadWorkActivity$(project.id));

        // 2) Load a map image (data URL for DOCX embedding)
        const mapUrl = await this.reportLoaderService.loadProjectPerimeterMap();

        // 3) Collect meta information (triggering person, manager, etc.)
        const primary = (this.reportLoaderService as any)?.primaryNeed;
        const mgmt = (this.reportLoaderService as any)?.managementArea;

        const ausloesende = `${primary?.properties?.orderer?.firstName ?? '-'} ${primary?.properties?.orderer?.lastName ?? '-'}`;
        const ausloesendesWerk = primary?.properties?.orderer?.organisationalUnit?.abbreviation ?? '-';
        const gm = `${mgmt?.manager?.firstName ?? '-'} ${mgmt?.manager?.lastName ?? '-'}`;

        const comment = (this.reportLoaderService as any)?.roadWorkActivity?.properties?.comment ?? '-';

        let mitwirkende = '-';
        try {
          // Optional helper to get names of involved organisations
          const f = (this.reportLoaderService as any)?.getInvolvedOrgsNames;
          mitwirkende = typeof f === 'function' ? f.call(this.reportLoaderService) : '-';
        } catch { /* ignore errors safely */ }

        // 4) Prepare table rows for assigned road work needs
        const assigned = this.reportLoaderService?.needsOfActivityService?.assignedRoadWorkNeeds ?? [];
        const assignedRows = assigned.map((item: any) => ({
          titelAbschnitt: `${item?.properties?.name ?? '-'}`,
          ausloesegrund: item?.properties?.description ?? '-',
          ausloesende: `${item?.properties?.orderer?.firstName ?? '-'} ${item?.properties?.orderer?.lastName ?? '-'}`,
          werk: item?.properties?.orderer?.organisationalUnit?.abbreviation ?? '-',
          erstelltAm: this.formatDate(item?.properties?.created),
          wunschtermin: this.formatDate(item?.properties?.finishOptimumTo),
          ausloesend: item?.properties?.isPrimary ? 'Ja' : 'Nein',
        }));

        // 5) Fetch intersecting road work needs asynchronously
        const roadWorkNeeds: any[] = await firstValueFrom(
          this.roadWorkNeedService.getIntersectingRoadWorkNeeds(project.id)
        );
        // Build list of assigned UUIDs for filtering
        const assignedUuids = new Set(
          assigned
            .map((item: any) => item?.properties?.uuid)
            .filter((uuid: string | undefined) => !!uuid)
        );

        // 6) Map them into rows for the "Not Assigned" table
        const notAssignedNeedsRows = roadWorkNeeds
        .filter((item: any) => {
          // filter out these which are already assigned
          const uuid = item?.properties?.uuid;          
          if (!uuid) return true;
          return !assignedUuids.has(uuid);
        })
        .map((item: any) => ({
          titelAbschnitt: `${item?.properties?.name ?? '-'}`,
          ausloesegrund: item?.properties?.description ?? '-',
          ausloesende: `${item?.properties?.orderer?.firstName ?? '-'} ${item?.properties?.orderer?.lastName ?? '-'}`,
          werk: item?.properties?.orderer?.organisationalUnit?.abbreviation ?? '-',
          erstelltAm: this.formatDate(item?.properties?.created),
          wunschtermin: this.formatDate(item?.properties?.finishOptimumTo),
          ausloesend: item?.properties?.isPrimary ? 'Ja' : 'Nein',
        }))

        // 7) Add the fully prepared project entry to the output array
        items.push({
          project,
          mapUrl,
          meta: { ausloesende, ausloesendesWerk, gm, comment, mitwirkende },
          assignedNeedsRows: assignedRows,
          notAssignedNeedsRows: notAssignedNeedsRows,
        });
      } catch (err) {
        // Any error while processing a project will be logged, but other projects continue
        console.error('prepareRoadWorkActivity: project failed', project?.id, err);
      }
    }

    // 8) Return all collected results after all projects are processed
    return items;
  }


  /**
   * Render meta-section (four lines) under a project.
   * Call this right after the project's map/title.
   */
  makeProjectMetaBlock(meta: {
    ausloesende: string;
    ausloesendesWerk: string;
    gm: string;
    comment: string;
    mitwirkende: string;
  }): Paragraph[] {        
    return [
      this.pChildren([
        new TextRun({ text: "Auslösende:r: ", bold: true }),
        new TextRun(meta.ausloesende || "Keine")
      ]),

      this.pChildren([
        new TextRun({ text: "Auslösendes Werk: ", bold: true }),
        new TextRun(meta.ausloesendesWerk || "Keine")
      ]),

      this.pChildren([
        new TextRun({ text: "Gebietsmanagement: ", bold: true }),
        new TextRun(meta.gm || "Keine")
      ]),

      this.pChildren([
        new TextRun({ text: "Beschrieb Bauvorhaben: ", bold: true }),
        new TextRun(meta.comment || "Keine")
      ]),

      this.pChildren([
        new TextRun({ text: "Mitwirkende: ", bold: true }),
        new TextRun(meta.mitwirkende ? meta.mitwirkende : "Keine")
      ])
    ];
  }

  /** Inserts soft hyphens into long words to allow wrapping in Word tables */
  private hyphenateLongTokens(s: string, chunk = 12): string {
    if (!s) return '';
    // Split by spaces, inject soft hyphen every N chars for long tokens
    return s
      .split(/(\s+)/)
      .map(tok => {
        if (tok.trim().length <= chunk || /\s/.test(tok)) return tok;
        const chars = [...tok];
        const out: string[] = [];
        for (let i = 0; i < chars.length; i++) {
          out.push(chars[i]);
          if ((i + 1) % chunk === 0 && i !== chars.length - 1) out.push('\u00AD'); // soft hyphen
        }
        return out.join('');
      })
      .join('');
  }

  pageBreak(): Paragraph {
    return new Paragraph({
      children: [new PageBreak()],
    });
  }
  
  private pSmall(text: string, bold = false) {
    return this.p(text, { sizeHalfPt: 18, bold });
  }
  
  /**
   * Builds a compact Needs table
   */
  makeNeedsTableFromRows(
    rows: Array<{
      titelAbschnitt: string;
      ausloesegrund: string;
      ausloesende: string;
      werk: string;
      erstelltAm: string;
      wunschtermin: string;
      ausloesend: string;
    }>    
  ): Table {
    // --- Table header row ---
    const header = new TableRow({
      tableHeader: true,
        children: [
          new TableCell({
          verticalAlign: 'top',
          children: [this.pSmall('Auslösende:r', true)],
        }),
        new TableCell({
          verticalAlign: 'top',
          children: [this.pSmall('Titel & Abschnitt', true)],
        }),
        new TableCell({
          verticalAlign: 'top',
          children: [this.pSmall('Auslösegrund', true)],
        }),      
        new TableCell({
          verticalAlign: 'top',
          children: [this.pSmall('Werk', true)],
        }),
        new TableCell({
          verticalAlign: 'top',
          children: [this.pSmall('Erstellt am', true)],
        }),
        new TableCell({
          verticalAlign: 'top',
          children: [this.pSmall('Wunschtermin', true)],
        }),
        new TableCell({
          verticalAlign: 'top',
          children: [this.pSmall('auslösend', true)],
        }),
      ],
    });

    // --- Table body rows ---
    const body = (rows ?? []).map((r) =>
      new TableRow({
        children: [
          new TableCell({
            verticalAlign: 'top',
            children: [this.pSmall(r.ausloesende)],
          }),
          new TableCell({
            verticalAlign: 'top',
            children: [
              this.pSmall(r.titelAbschnitt),
            ],
          }),
          new TableCell({
            verticalAlign: 'top',
            children: [this.pSmall(r.ausloesegrund)],
          }),        
          new TableCell({
            verticalAlign: 'top',
            children: [this.pSmall(r.werk)],
          }),
          new TableCell({
            verticalAlign: 'top',
            children: [this.pSmall(r.erstelltAm)],
          }),
          new TableCell({
            verticalAlign: 'top',
            children: [this.pSmall(r.wunschtermin)],
          }),
          new TableCell({
            verticalAlign: 'top',
            children: [this.pSmall(r.ausloesend)],
          }),
        ],
      })
    );

    // --- Build final table with compact cell margins ---
    return new Table({
      width: { type: WidthType.PERCENTAGE, size: 100 },
      margins: { top: 80, bottom: 80, left: 80, right: 80 }, // ~1.1 mm padding
      rows: [header, ...body],
    });
  }

  /**
   * Intro block for the first page:
   * address (left) | logo (right) + separator + title (+ optional subtitle)
   */
  async makeIntroBlock(this: any, opts: {
    logoUrl: string;
    addressLines: string[];
    title: string;
    subtitle?: string;
    logoWidthPx?: number;
  }) {
    const { logoUrl, addressLines, title, subtitle, logoWidthPx = 140 } = opts;

    const logoRun = await this.imageFromUrlFitted(logoUrl, logoWidthPx); // may be null

    // Left address block
    const addressRuns: TextRun[] = [];
    (addressLines ?? []).forEach((line, idx) => {
      if (idx > 0) addressRuns.push(new TextRun({ break: 1 }));
      // simple "*bold*" support for single word e.g. *Tiefbauamt*
      const m = /^\*(.+)\*$/.exec(line.trim());
      if (m) {
        addressRuns.push(new TextRun({ text: m[1], bold: true }));
      } else {
        addressRuns.push(new TextRun({ text: this.sanitizeText(line) }));
      }
    });

    const addressPara = new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 60 },
      children: addressRuns,
    });

    // Two-column header area (address | logo)
    const topTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: noBorders,
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [addressPara],
            }),
            new TableCell({
              borders: noBorders,
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: logoRun ? [logoRun] : [],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    // Separator line
    const separator = new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, color: 'CCCCCC', size: 6 } },
      spacing: { before: 60, after: 120 },
    });

    // Title & optional subtitle
    const titlePara = new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 60 },
      children: [new TextRun({ text: this.sanitizeText(title), bold: true, size: 33 })], // bigger title
    });

    const elements: Array<Paragraph | Table> = [topTable, separator, titlePara];

    if (subtitle) {
      elements.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 60 },
          children: [new TextRun({ text: this.sanitizeText(subtitle), color: '666666', size: 22 })],
        }),
        // second separator under the title (your request)
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, color: 'CCCCCC', size: 6 } },
          spacing: { before: 60, after: 120 },
        })
      );
    }

    return elements;
  }

  /** Builds “Traktanden” + “Beilagen” section. */
  makeAgendaAndAttachmentsSection(opts: {
    prevSessionDate: string;      
    attachments: string;   
    isPreProtocol?: boolean;
  }): Paragraph[] {
    const { prevSessionDate, attachments, isPreProtocol } = opts;

    // Traktanden (agenda)
    const blocks: Paragraph[] = [
      this.pBold('Traktanden'),
      this.p(`1. Abnahme SKS-Protokoll vom ${this.sanitizeText(prevSessionDate)}`),
      isPreProtocol? this.p('2. Koordination künftige Bauvorhaben') :  this.p('2. Koordination Bauvorhaben'),
      this.p('3. Verschiedenes'),
      this.p('4. Nächste Sitzungen'),
      this.smallGap(),
      this.pBold('Beilagen'),
    ];

    // Beilagen (attachments) from a single string
    const raw = (attachments ?? '').trim();
    if (raw.length === 0) {
      blocks.push(this.p('–'));
    } else {
      // split by comma or newline
      const items = raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      for (const it of items) {
        // simple hyphen list; avoids numbering definitions
        blocks.push(this.p(`${this.sanitizeText(it)}`));
      }
    }

    return blocks;
  }

  /** Approach-Proposal / Approach **/
  makeProtocolSections(opts: {
    lastSksDate: string;
    sksDate: string;
    nextSksDate: string;
    acceptanceText: string;
    reportType?: string;
    isPreProtocol?: boolean;
  }): Paragraph[] {
    const { lastSksDate, sksDate, nextSksDate, acceptanceText, reportType, isPreProtocol } = opts;
    

    let approach = [];    
    approach.push(this.smallGap());    
    approach.push(this.pBold(`1. Abnahme SKS-Protokoll vom ${this.sanitizeText(lastSksDate)}`));
    approach.push(this.p(acceptanceText || '–', { colorHex: '333333' }));

    if (isPreProtocol) {      
      approach.push(this.smallGap());
      approach.push(this.pBold(`2. Koordination künftige Bauvorhaben`));
      approach.push(this.p(`Gerne haben wir die erfassten Bedarfe geprüft und koordiniert.`));

      approach.push(this.smallGap());
      let approachText1 = 
              "Die nachfolgenden " + (isPreProtocol ? "Vorgehensvorschläge" : "Vorgehen") + " wurden " +
              "mit Bedarfsklärung 1. Iteration sowie nach allfälligen Anpassungen " +
              "mit Bedarfsklärung 2. Iterationen zur Prüfung zur Verfügung gestellt. ";              
      let approachText2 = 
              "Mit Auslösen der Stellungnahme konnten sich alle Beteiligten zur vorgesehenen Umsetzung abschliessend äussern. ";
              
      let approachText3 =  
              "Nachfolgend eine Gesamtübersicht aller Bauvorhaben, welche für diese SKS traktandiert wurden.";

      approach.push(this.p(approachText1, { lineSpacing: 400 }));
      approach.push(this.p(approachText2, { lineSpacing: 400 }));
      approach.push(this.p(approachText3, { lineSpacing: 400 }));

    } else {
      approach.push(this.smallGap());
      approach.push(this.pBold(`2. Koordination Bauvorhaben`));
      approach.push(this.p("Die nachfolgenden Vorgehen werden voraussichtlich an der SKS vom " +
                    this.formatDate(nextSksDate) +
                    " behandelt."));      
    }
    return approach;
  }

 /**
 * Generates a full-width gray title bar (like a section header) that spans the page width.
 * Used for project or section titles such as “Bauvorhaben: …”.
 */
  makeFullWidthTitle(
    text: string,
    opts?: {
      /** Background color in hex (default: D9D9D9). */
      bgColor?: string;
      /** Font size in half-points (default: 32 ≈ 16 pt). */
      sizeHalfPt?: number;
      /** Text color (default: black). */
      textColor?: string;
      /** Adds page break before (default: true). */
      pageBreakBefore?: boolean;
    }
  ): Table {
    const { bgColor = "D9D9D9", sizeHalfPt = 32, textColor = "000000", pageBreakBefore = true } =
      opts || {};

    const noBorders = {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    };

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: bgColor },
              borders: noBorders,
              verticalAlign: "center",
              margins: { top: 50, bottom: 30, left: 200, right: 200 }, // padding inside cell
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  spacing: { after: 60 },
                  pageBreakBefore,
                  children: [
                    new TextRun({
                      text,
                      bold: true,
                      color: textColor,
                      size: sizeHalfPt,
                      font: "Arial", // enforce sans-serif
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  /** “Verschiedenes” */
  makeMiscItemsSection(opts: {    
    miscItems: string;       // single string, comma- or newline-separated
  }): Paragraph[] {
    const { miscItems } = opts;

    const blocks: Paragraph[] = [      
      this.smallGap(),
      this.pBold('3. Verschiedenes'),
    ];

    // Vierschiedenes (miscItems) from a single string
    const raw = (miscItems ?? '').trim();
    if (raw.length === 0) {
      blocks.push(this.p('–'));
    } else {
      // split by comma or newline
      const items = raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      for (const it of items) {
        // simple hyphen list; avoids numbering definitions
        blocks.push(this.p(`${this.sanitizeText(it)}`));
      }
    }

    return blocks;
  }

  makeNextSessionSection(opts: {
    nextSKSDate?: string;
    nextOKSDate?: string;
    nextKAPDate?: string;
    reportWriter: string;
  }): Paragraph[] {
    const {
      nextSKSDate = '«Datum nächste SKS»',
      nextOKSDate = '«Datum nächste OKS»',
      nextKAPDate = '«Datum nächste KAP»',
      reportWriter = '«Name Protokollführer:in»'
    } = opts;

    const blocks: Paragraph[] = [
      this.smallGap(),
      this.pBold('4. Nächste Sitzungen'),

      this.pBold('SKS'),
      this.p(`Die nächste SKS findet voraussichtlich am ${nextSKSDate} statt.`),
      this.pItalic('Superblock, Pionierstrasse 7 (Sitzungszimmer SZ Public B001 PION5)'),

      this.pBold('OKS'),
      this.p(`Die nächste OKS findet voraussichtlich am ${nextOKSDate} statt.`),
      this.pItalic('Superblock, Pionierstrasse 7 (Sitzungszimmer SZ Public B001 PION5)'),

      this.pBold('KAP'),
      this.p(`Die nächste KAP findet voraussichtlich am ${nextKAPDate} statt.`),
      this.pItalic('Superblock, Pionierstrasse 7 (Sitzungszimmer SZ Public B012 PION5)'),

      this.smallGap(),
      this.p('Für das Protokoll'),
      this.smallGap(),
      this.p(`Winterthur, ${this.formatDate(new Date())}`),
      this.p('Abteilung Planung und Koordination (APK)'),
      this.pItalic(`${reportWriter}`),
    ];

    return blocks;
  }

  
  async makeConsultationInputsSection(opts: {
    uuid: string;
    feedbackPhase: string;
    isPhaseReporting: boolean;
  }): Promise<(Paragraph | Table)[]> {
    const { uuid, feedbackPhase, isPhaseReporting } = opts;

    // --- Visual tuning constants (very compact)
    const FONT_SMALL = 14;            // ~7 pt
    const LINE_SPACING = 220;         // ~ single / slightly tight
    const CELL_MARG = { top: 10, bottom: 10, left: 10, right: 10 }; // tiny margins (twips)
    const HEADER_ROW_HEIGHT = 1300;   // taller header row for vertical text (twips, ~55pt)
    const BODY_ROW_HEIGHT = 500;      // slightly taller body rows for some vertical padding (twips)

    // Helper: compact paragraph (optionally bold, optional no-break)
    const pTiny = (text: string, bold = false, noBreak = false) =>
      new Paragraph({
        spacing: { line: LINE_SPACING, before: 0, after: 0 },
        children: [
          new TextRun({
            text: noBreak ? (text ?? '').replace(/\s/g, '\u00A0') : (text ?? '-'),
            bold: bold || undefined,
            size: FONT_SMALL,
          }),
        ],
      });

    // Fetch and filter by phase
    const allInputs = await firstValueFrom(this.consultationService.getConsultationInputs(uuid));
    const filtered = (allInputs ?? [])
                      .filter(ci => ci?.feedbackGiven === true)
                      .filter(ci => ci?.feedbackPhase === feedbackPhase);

    // Sort (org → name) with de-CH rules
    const collator = new Intl.Collator('de-CH', {
      sensitivity: 'base',
      ignorePunctuation: true,
      numeric: true,
    });

    const consultationInputs = filtered.slice().sort((a, b) => {
      const aOrg = a?.inputBy?.organisationalUnit?.abbreviation ?? '';
      const bOrg = b?.inputBy?.organisationalUnit?.abbreviation ?? '';
      const orgCmp = collator.compare(aOrg, bOrg);
      if (orgCmp !== 0) return orgCmp;
      const aName = `${a?.inputBy?.firstName ?? ''} ${a?.inputBy?.lastName ?? ''}`.trim();
      const bName = `${b?.inputBy?.firstName ?? ''} ${b?.inputBy?.lastName ?? ''}`.trim();
      return collator.compare(aName, bName);
    });

    if (!consultationInputs.length) {
      return [
        this.p('Keine Einträge vorhanden.'),
      ];
    }

    // Column set definition
    type ColKey =
      | 'need_link'
      | 'organisation'
      | 'name'
      | 'feedback_input'
      | 'feedback_input_text'
      | 'date_last_change'
      | 'has_feedback'
      | 'no_requirement_anymore'
      | 'activity_okay'
      | 'consult_input';

    const baseCols: ColKey[] = [
      'need_link',
      'organisation',
      'name',
      'feedback_input',
      'feedback_input_text',
      'date_last_change',
      'has_feedback',
      'no_requirement_anymore',
      'activity_okay',
      'consult_input',
    ];

    // Columns that should have vertical header text
    const verticalHeaderCols: ColKey[] = [
      'has_feedback',
      'no_requirement_anymore',
      'activity_okay',
    ];

    // Header labels (slightly shortened for "checkmark" columns)
    const headerLabel = (key: ColKey): string => {
      switch (key) {
        case 'need_link': return 'Bedarf';
        case 'organisation': return 'Werk';
        case 'name': return 'Vernehmlassende:r';
        case 'feedback_input': return 'Rückmeldung';
        case 'feedback_input_text': return 'Kommentar';
        case 'date_last_change': return 'Letzte Änderung';
        case 'has_feedback': return 'Rückm. erhalten';
        case 'no_requirement_anymore':
          return isPhaseReporting ? 'Weiterhin Bedarf' : 'Bedarf vorhanden';
        case 'activity_okay':
          return isPhaseReporting ? 'Vorgehen passt' : 'Vorgehen';
        case 'consult_input': return 'Bemerkung GM';
        default: return '';
      }
    };

    // Optional trimming of vertical header labels (in case they get too long)
    const headerText = (key: ColKey): string => {
      const label = headerLabel(key);
      if (!verticalHeaderCols.includes(key)) return label;
      const maxLen = 18;
      return label.length > maxLen ? label.slice(0, maxLen - 1) + '…' : label;
    };

    // Column widths (sum ≈ 100)
    // - "Werk" is very narrow (short header + 3-letter values)
    // - "Kommentar" and "Bemerkung GM" are as wide as reasonably possible
    const widths: Record<ColKey, number> = {
      need_link: 12,
      organisation: 5,
      name: 16,
      feedback_input: 10,
      feedback_input_text: 24, // Kommentar – main text area
      date_last_change: 8,
      has_feedback: 3,
      no_requirement_anymore: 3,
      activity_okay: 4,
      consult_input: 15,       // Bemerkung GM – second main text area
    };

    // Formatters
    const fmtDate = (d?: string | Date): string => {
      try {
        if (!d) return '-';
        const dt = typeof d === 'string' ? new Date(d) : d;
        if (isNaN(dt.getTime())) return '-';
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yyyy = dt.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
      } catch {
        return '-';
      }
    };

    const feedbackLabel = (v: string | null | undefined): string => {
      if (!v) return '—';
      if (v === 'no_requirement_anymore') return isPhaseReporting ? 'Kein Bedarf' : 'Kein Bedarf';
      if (v === 'activity_okay') return isPhaseReporting ? 'Ja, einverstanden' : 'Bedarf vorhanden';
      if (v === 'activity_not_okay') return isPhaseReporting ? 'Nein, Kontaktaufnahme' : '—';
      return String(v);
    };

    const check = '✓';
    const cross = '✗';
    const trunc = (s: string, n = 20) =>
      !s ? '-' : (s.length > n ? s.slice(0, n) + '…' : s);

    // Header row (taller, with vertical text for selected columns)
    const headerRow = new TableRow({
      tableHeader: true,
      height: { value: HEADER_ROW_HEIGHT, rule: HeightRule.ATLEAST },
      children: baseCols.map((key) =>
        new TableCell({
          verticalAlign: VerticalAlign.CENTER,
          width: { size: widths[key], type: WidthType.PERCENTAGE },
          margins: CELL_MARG,
          shading: { fill: 'EEEEEE' },
          textDirection: verticalHeaderCols.includes(key)
            ? TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT
            : undefined,
          children: [pTiny(headerText(key), true, true)],
        })
      ),
    });

    // Body rows (slightly increased height for better readability)
    const rows = consultationInputs.map((ci: any) => {
      const cells: TableCell[] = [];

      // Bedarf
      const need = ci?.roadworkNeedName ?? '-';
      cells.push(new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: widths.need_link, type: WidthType.PERCENTAGE },
        margins: CELL_MARG,
        children: [pTiny(need)],
      }));

     // Werk
      const org = ci?.inputBy?.organisationalUnit?.abbreviation ?? '-';
      cells.push(new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: widths.organisation, type: WidthType.PERCENTAGE },
        margins: CELL_MARG,
        children: [pTiny(org, false, true)],
      })); 

      // Vernehmlassende:r
      const name = `${ci?.inputBy?.firstName ?? ''} ${ci?.inputBy?.lastName ?? ''}`.trim() || '-';
      cells.push(new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: widths.name, type: WidthType.PERCENTAGE },
        margins: CELL_MARG,
        children: [pTiny(name)],
      }));

      // Rückmeldung (label)
      cells.push(new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: widths.feedback_input, type: WidthType.PERCENTAGE },
        margins: CELL_MARG,
        children: [pTiny(feedbackLabel(ci?.ordererFeedback))],
      }));

      // Kommentar
      const fbText = (ci?.ordererFeedbackText ?? '').toString().trim();
      cells.push(new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: widths.feedback_input_text, type: WidthType.PERCENTAGE },
        margins: CELL_MARG,
        children: [pTiny(fbText)],
      }));

      // Letzte Änderung
      const dt = fmtDate(ci?.lastEdit);
      cells.push(new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: widths.date_last_change, type: WidthType.PERCENTAGE },
        margins: CELL_MARG,
        children: [pTiny(dt === '-' ? '-' : dt, false, true)],
      }));

      // Rückmeldung erhalten (✓/✗)
      const hasFb = (ci?.ordererFeedback ?? '') !== '';
      cells.push(new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: widths.has_feedback, type: WidthType.PERCENTAGE },
        margins: CELL_MARG,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: LINE_SPACING, before: 0, after: 0 },
            children: [new TextRun({ text: hasFb ? check : cross, size: FONT_SMALL })],
          }),
        ],
      }));

      // Weiterhin Bedarf (✓ unless 'no_requirement_anymore')
      const stillNeeded = hasFb && ci?.ordererFeedback !== 'no_requirement_anymore';
      cells.push(new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: widths.no_requirement_anymore, type: WidthType.PERCENTAGE },
        margins: CELL_MARG,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: LINE_SPACING, before: 0, after: 0 },
            children: [new TextRun({ text: stillNeeded ? check : cross, size: FONT_SMALL })],
          }),
        ],
      }));

      // Vorgehen passt (✓/✗/—)
      const ok = ci?.ordererFeedback === 'activity_okay';
      const notOk = ci?.ordererFeedback === 'activity_not_okay';
      const mark = ok ? check : (notOk ? cross : '—');
      cells.push(new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: widths.activity_okay, type: WidthType.PERCENTAGE },
        margins: CELL_MARG,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: LINE_SPACING, before: 0, after: 0 },
            children: [new TextRun({ text: mark, size: FONT_SMALL })],
          }),
        ],
      }));

      // Bemerkung GM
      const mgr = (ci?.managerFeedback ?? '').toString().trim();
      cells.push(new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        width: { size: widths.consult_input, type: WidthType.PERCENTAGE },
        margins: CELL_MARG,
        children: [pTiny(mgr)],
      }));

      return new TableRow({
        height: { value: BODY_ROW_HEIGHT, rule: HeightRule.ATLEAST },
        children: cells,
      });
    });

    const table = new Table({
      width: { type: WidthType.PERCENTAGE, size: 100 },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      },
      rows: [headerRow, ...rows],
    });

    return [table];
  }


}
