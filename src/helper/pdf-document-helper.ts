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

    const doc = new jsPDF();

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

    doc.setFontSize(TITLE_FONT_SIZE);
    doc.text("Projekt-Dokument", MARGIN_X, 35);

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

    const lorem = `Dies ist ein sehr langer Text, der automatisch in mehrere\nZeilen umgebrochen wird, wenn er zu lang ist …`;
    const wrapped = doc.splitTextToSize(lorem, 170);
    doc.text(wrapped, MARGIN_X, 115);

    /* ===== Seite 2 (Beispiel) ===== */
    doc.addPage();
    drawHeader();
    doc.text(wrapped, MARGIN_X, 35);

    /* ===== Sicherheit: Header nachträglich auf alle Seiten ===== */
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      drawHeader();
    }

    doc.save("projekt-dokument.pdf");
  }
}
