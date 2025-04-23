import jsPDF from "jspdf";
import { RoadWorkActivityFeature } from "src/model/road-work-activity-feature";

export class PdfDocumentHelper {

    public static generatePDF(roadWorkActivity: RoadWorkActivityFeature): void {
        if(roadWorkActivity){
          const doc = new jsPDF();
      
          doc.setFontSize(16);
          doc.text('Projekt-Dokument', 20, 20);
      
      
          doc.setFontSize(11);
          doc.text('UUID: ' + roadWorkActivity.properties.uuid, 20, 40);
          doc.text('Projektnummer: ' + roadWorkActivity.properties.projectNo, 20, 45);
          doc.text('Titel: ' + roadWorkActivity.properties.name, 20, 50);
          doc.text('Abschnitt: ' + roadWorkActivity.properties.section, 20, 55);
          doc.text('Auslösegrund: ' + roadWorkActivity.properties.description, 20, 60);
          doc.text('Bemerkung: ' + roadWorkActivity.properties.comment, 20, 65);
          const dateCreated: Date = new Date(roadWorkActivity.properties.created);
          const dateCreatedFormatted = `${String(dateCreated.getDate()).padStart(2, '0')}.${String(dateCreated.getMonth() + 1).padStart(2, '0')}.${dateCreated.getFullYear()}`;
          doc.text('Erstellt am: ' + dateCreatedFormatted, 20, 80);
    
          const text = `Dies ist ein sehr langer Text, der automatisch in mehrere Zeilen umgebrochen wird, wenn er zu lang ist, um in eine einzige Zeile zu passen. So können bequem längere Absätze oder Beschreibungen in ein PDF eingefügt werden.`;
        
          const lines = doc.splitTextToSize(text, 170);  // Zeilenbreite 170 ist ungefähr A4-Seite mit 20 mm Rand
          doc.text(lines, 20, 100);
    
          doc.addPage();
          doc.text(lines, 20, 20);
      
          doc.save('projekt-dokument.pdf');  
        }
      }

}