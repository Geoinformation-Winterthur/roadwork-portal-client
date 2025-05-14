import jsPDF from "jspdf";
import { RoadWorkActivityFeature } from "src/model/road-work-activity-feature";

export class PdfDocumentHelper {

  /**
   * Erstellt ein Projekt-PDF.
   * @param roadWorkActivity Datensatz der Strassenbau-Aktivität
   */
  public static generatePDF(roadWorkActivity: RoadWorkActivityFeature): void {
    if (!roadWorkActivity) return;

    /* ===== Layout-Konstanten ===== */
    const MARGIN_X = 20;
    const HEADER_Y = 10;
    const HEADER_FONT_SIZE = 8;
    const BODY_FONT_SIZE = 11;
    const TITLE_FONT_SIZE = 16;

    const HEADER_COLOR: [number, number, number] = [120, 120, 120]; // Grau
    const BODY_COLOR: [number, number, number] = [0, 0, 0];         // Schwarz
    const BAR_COLOR  = [200, 200, 200] as const // Hellgrau Balken

    const doc = new jsPDF();

    /**
     * Formatiert ein Date-Objekt **oder** einen Date-String in «DD.MM.YYYY».
     * Liefert bei ungültigem Input den ursprünglichen Wert als String zurück.
     */
    const formatDate = (value: Date | string | undefined | null): string => {
      if (value === undefined || value === null) return "[Datum fehlt]";
      const d: Date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${day}.${month}.${d.getFullYear()}`;
    };

    /** Bold‑Helper: gibt kurzzeitig Fettschrift aus */
    const bold = (cb: () => void) => {
      doc.setFont("helvetica", "bold");
      cb();
      doc.setFont("helvetica", "normal");
    };

    /**
     * Kopf (Adresse) auf der aktuellen Seite zeichnen
     */
    const drawHeader = (): void => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(HEADER_FONT_SIZE);
      doc.setTextColor(...HEADER_COLOR);

      doc.text("Departement Bau und Mobilität", MARGIN_X, HEADER_Y);
      doc.setFont("helvetica", "bold");
      doc.text("Tiefbauamt", MARGIN_X, HEADER_Y + 4);
      doc.setFont("helvetica", "normal");
      doc.text("Pionierstrasse 7", MARGIN_X, HEADER_Y + 8);
      doc.text("8403 Winterthur", MARGIN_X, HEADER_Y + 12);

      /* Body-Format zurücksetzen */
      doc.setFontSize(BODY_FONT_SIZE);
      doc.setTextColor(...BODY_COLOR);
      doc.setFont("helvetica", "normal");
    };

    /* ===== Seite 1 ===== */
    drawHeader();

    /* Horizontale Linie über fast die ganze Seitenbreite */
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setLineWidth(0.4);                       // dünne Linie
    doc.line(MARGIN_X, HEADER_Y + 18, pageWidth - MARGIN_X, HEADER_Y + 18);

    doc.setFontSize(TITLE_FONT_SIZE);
    doc.setFont("helvetica", "bold");
    doc.text("Strategische Koordinationssitzung (SKS) - Vor-Protokoll", MARGIN_X, 35);
    doc.setFont("helvetica", "normal");

    doc.line(MARGIN_X, HEADER_Y + 28, pageWidth - MARGIN_X, HEADER_Y + 28);

    doc.setFontSize(BODY_FONT_SIZE);
    const p = roadWorkActivity.properties;
    doc.text(`UUID: ${p.uuid}`, MARGIN_X, 55);
    doc.text(`Projektnummer: ${p.projectNo}`, MARGIN_X, 60);
    doc.text(`Titel: ${p.name}`, MARGIN_X, 65);
    doc.text(`Abschnitt: ${p.section}`, MARGIN_X, 70);
    doc.text(`Auslösegrund: ${p.description}`, MARGIN_X, 75);
    doc.text(`Bemerkung: ${p.comment}`, MARGIN_X, 80);

    const created = new Date(p.created);
    doc.text(`Erstellt am: ${created.toLocaleDateString("de-CH")}`, MARGIN_X, 95);

    let lorem = `Dies ist ein sehr langer Text, der automatisch in mehrere\nZeilen umgebrochen wird, wenn er zu lang ist …`;
    let wrapped = doc.splitTextToSize(lorem, 170);
    doc.text(wrapped, MARGIN_X, 115);

    /* ===== Seite 2 (Beispiel) ===== */
    doc.addPage();
    drawHeader();

    const startY = 40; // erster Text unter Kopflinie
    doc.setFont("helvetica", "bold");
    doc.text("1. Abnahme SKS-Protokoll vom «Datum letzte Sitzung»", MARGIN_X, startY);
    doc.setFont("helvetica", "normal");
    doc.text("•  Das Protokoll wird ohne Anmerkungen genehmigt und verdankt.", MARGIN_X + 4, startY + 6);

    doc.setFont("helvetica", "bold");
    doc.text("2. Koordination künftige Bauvorhaben", MARGIN_X, startY + 18);
    doc.setFont("helvetica", "normal");
    doc.text("Gerne haben wir die erfassten Bedarfe geprüft und koordiniert.", MARGIN_X, startY + 24);

    lorem = "Die nachfolgenden Vorgehensvorschläge wurden mit Versand der Bedarfsklärung vom " +
      formatDate(roadWorkActivity.properties.dateConsultStart) +
      " erstmalig zur Prüfung versendet. Mit Stellungnahme vom " +
      formatDate(roadWorkActivity.properties.dateReportStart) +
      " erfolgt der aktualisierte Versand zur endgültigen Prüfung." +
      " Die nachfolgenden Vorgehen werden voraussichtlich an der SKS vom " +
      formatDate(roadWorkActivity.properties.dateSksReal) +
      " behandelt.";
    wrapped = doc.splitTextToSize(lorem, 170);
    doc.text(wrapped, MARGIN_X, 80);

    /** Balken "Bauvorhaben:" */
    const BAR_Y = 100;
    const BAR_HEIGHT = 12;
    doc.setFillColor(...BAR_COLOR);
    doc.rect(MARGIN_X, BAR_Y, pageWidth - 2 * MARGIN_X, BAR_HEIGHT, "F");

    doc.setTextColor(...BODY_COLOR);
    doc.setFontSize(13);
    bold(() => doc.text(`Bauvorhaben: «${p.name}/${p.section}»`, MARGIN_X + 2, BAR_Y + 8));
    doc.setFontSize(BODY_FONT_SIZE);

    /* ===== Sicherheit: Header nachträglich auf alle Seiten ===== */
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      drawHeader();
    }

    doc.save("projekt-dokument.pdf");
  }
}
