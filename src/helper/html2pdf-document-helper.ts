import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export class Html2PdfDocumentHelper {



 public static async generatePdf(
    htmlTemplate: string,
    values: Record<string, string>,
    container: HTMLElement
  ): Promise<void> {
    // Fill placeholders and inject HTML
    container.innerHTML = this.fillPlaceholders(htmlTemplate, values);

    // Force browser to render
    await new Promise(resolve => setTimeout(resolve, 100));

    // Wait for all images (if any)
    await this.waitForImagesToLoad(container);

    // Get the first child of the container (the real content)
    const target = container.firstElementChild as HTMLElement;

    if (!target || target.offsetWidth === 0 || target.offsetHeight === 0) {
      console.error('⚠️ Target content has no dimensions. Check CSS or visibility.');
      return;
    }

    // Render to canvas
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('report.pdf');
  }


  private static fillPlaceholders(template: string, values: Record<string, string>): string {
    return template.replace(/\[placeholder_(\w+)\]/g, (_, key) => values[key] || '');
  }

  private static waitForImagesToLoad(container: HTMLElement): Promise<void> {
    const images = container.querySelectorAll('img');
    const promises = Array.from(images).map(img =>
      img.complete ? Promise.resolve() : new Promise(resolve => {
        img.onload = resolve;
        img.onerror = () => {
          console.warn('⚠️ Image failed to load:', img.src);
          resolve(null);
        };
      })
    );
    return Promise.all(promises).then(() => undefined);
  }

}
