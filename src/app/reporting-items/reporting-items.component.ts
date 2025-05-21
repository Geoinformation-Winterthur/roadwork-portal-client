import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { PdfDocumentHelper } from 'src/helper/pdf-document-helper';
import { StatusHelper } from 'src/helper/status-helper';
import { ConsultationInput } from 'src/model/consultation-input';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';
import { User } from 'src/model/user';
import { ConsultationService } from 'src/services/consultation.service';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { UserService } from 'src/services/user.service';
import html2pdf from 'html2pdf.js';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reporting-items',
  templateUrl: './reporting-items.component.html',
  styleUrls: ['./reporting-items.component.css']
})
export class ReportingItemsComponent implements OnInit {

  @Input()
  roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();

  consultationInput: ConsultationInput = new ConsultationInput();

  consultationInputsFromReporting: ConsultationInput[] = [];

  tableDisplayedColumns: string[] = ['organisation', 'name', 'feedback', 'date_last_change', 'has_feedback', 'no_requirement_anymore', 'activity_okay', 'consult_input'];

  user: User;
  userService: UserService;

  needsOfActivityService: NeedsOfActivityService;

  statusHelper: StatusHelper;
  PdfDocumentHelper = PdfDocumentHelper;

  private consultationService: ConsultationService;
  private snckBar: MatSnackBar;

   @ViewChild('reportContainer', { static: false }) reportContainer!: ElementRef;

  constructor(consultationService: ConsultationService,
    needsOfActivityService: NeedsOfActivityService,
    userService: UserService, 
    snckBar: MatSnackBar,
    private http: HttpClient) {
    this.consultationService = consultationService;
    this.needsOfActivityService = needsOfActivityService;
    this.userService = userService;
    this.user = userService.getLocalUser();
    this.snckBar = snckBar;
    this.statusHelper = new StatusHelper();
  }

  ngOnInit(): void {

    this.userService.getUserFromDB(this.userService.getLocalUser().mailAddress)
      .subscribe({
        next: (user) => {
          if (user && user.length > 0)
            this.user = user[0];
        },
        error: (error) => {
        }
      });

    this.consultationInput.feedbackPhase = this.roadWorkActivity.properties.status;

    this.consultationService.getConsultationInputs(this.roadWorkActivity.properties.uuid)
      .subscribe({
        next: (consultationInputs) => {
          let consultationInputsFromReportingTemp: ConsultationInput[] = [];
          for (let consultationInput of consultationInputs) {
            if (consultationInput.feedbackPhase === 'reporting') {
              consultationInputsFromReportingTemp.push(consultationInput);
            }
          }
          this.consultationInputsFromReporting = consultationInputsFromReportingTemp;

          for (let consultationInput of consultationInputs) {
            if (consultationInput.inputBy.mailAddress === this.user.mailAddress &&
              consultationInput.feedbackPhase === this.roadWorkActivity.properties.status) {
              this.consultationInput = new ConsultationInput();
              this.consultationInput.uuid = "" + consultationInput.uuid;
              this.consultationInput.ordererFeedback = "" + consultationInput.ordererFeedback;
              this.consultationInput.managerFeedback = "" + consultationInput.managerFeedback;
              this.consultationInput.inputBy = consultationInput.inputBy;
              this.consultationInput.lastEdit = consultationInput.lastEdit;
              this.consultationInput.decline = consultationInput.decline;
              this.consultationInput.valuation = consultationInput.valuation;
              this.consultationInput.feedbackPhase = consultationInput.feedbackPhase;
              break;
            }
          }

        },
        error: (error) => {
        }
      });
  }

  sendReporting() {
    if (this.consultationInput.uuid === "") {
      this.consultationService.addConsultationInput(this.roadWorkActivity.properties.uuid,
        this.consultationInput)
        .subscribe({
          next: (consultationInput) => {
            if (consultationInput) {
              ErrorMessageEvaluation._evaluateErrorMessage(consultationInput);
              if (consultationInput.errorMessage.trim().length !== 0) {
                this.snckBar.open(consultationInput.errorMessage, "", {
                  duration: 4000
                });
              } else {
                this.snckBar.open("Rückmeldung gespeichert", "", {
                  duration: 4000
                });
              }
              let consultationInputObj: ConsultationInput = new ConsultationInput();
              consultationInputObj.uuid = "" + consultationInput.uuid;
              consultationInputObj.ordererFeedback = "" + consultationInput.ordererFeedback;
              consultationInputObj.managerFeedback = "" + consultationInput.managerFeedback;
              consultationInputObj.inputBy = consultationInput.inputBy;
              consultationInputObj.feedbackPhase = consultationInput.feedbackPhase;
              consultationInputObj.lastEdit = consultationInput.lastEdit;
              consultationInputObj.decline = consultationInput.decline;
              consultationInputObj.valuation = consultationInput.valuation;

              this.consultationInputsFromReporting.push(consultationInputObj);
            }
          },
          error: (error) => {
            this.snckBar.open("Unbekannter Fehler beim Speichern der Rückmeldung", "", {
              duration: 4000
            });
          }
        });
    } else {
      this.consultationService.updateConsultationInput(this.roadWorkActivity.properties.uuid,
        this.consultationInput)
        .subscribe({
          next: (consultationInput) => {
            if (consultationInput) {
              ErrorMessageEvaluation._evaluateErrorMessage(consultationInput);
              if (consultationInput.errorMessage.trim().length !== 0) {
                this.snckBar.open(consultationInput.errorMessage, "", {
                  duration: 4000
                });
              } else {
                this.snckBar.open("Rückmeldung gespeichert", "", {
                  duration: 4000
                });    
              }
              let consultationInputObj: ConsultationInput = new ConsultationInput();
              consultationInputObj.uuid = "" + consultationInput.uuid;
              consultationInputObj.ordererFeedback = "" + consultationInput.ordererFeedback;
              consultationInputObj.managerFeedback = "" + consultationInput.managerFeedback;
              consultationInputObj.inputBy = consultationInput.inputBy;
              consultationInputObj.feedbackPhase = consultationInput.feedbackPhase;
              consultationInputObj.lastEdit = consultationInput.lastEdit;
              consultationInputObj.decline = consultationInput.decline;
              consultationInputObj.valuation = consultationInput.valuation;

              let count: number = 0;
              for (let consultationInputElt of this.consultationInputsFromReporting) {
                if (consultationInputElt.uuid === consultationInputObj.uuid) {
                  break;
                }
                count++;
              }
              let consultationInputsFromReportingCopy = this.consultationInputsFromReporting.slice();
              consultationInputsFromReportingCopy.splice(count, 1);
              consultationInputsFromReportingCopy.push(consultationInputObj);
              this.consultationInputsFromReporting = consultationInputsFromReportingCopy;
            }
          },
          error: (error) => {
            this.snckBar.open("Unbekannter Fehler beim Speichern der Rückmeldung", "", {
              duration: 4000
            });
          }
        });
    }
  }

  updateComment(consultationInput: ConsultationInput) {
    this.consultationService.updateConsultationInput(this.roadWorkActivity.properties.uuid,
      consultationInput)
      .subscribe({
        next: (consultationInput) => {
          if (consultationInput) {
            ErrorMessageEvaluation._evaluateErrorMessage(consultationInput);
            if (consultationInput.errorMessage.trim().length !== 0) {
              this.snckBar.open(consultationInput.errorMessage, "", {
                duration: 4000
              });
            } else {
              this.snckBar.open("Bemerkung gespeichert", "", {
                duration: 4000
              });
            }
          }
        },
        error: (error) => {
          this.snckBar.open("Unbekannter Fehler beim Speichern der Bemerkung", "", {
            duration: 4000
          });
        }
      });

  }


  async generatePDF2() {
      const htmlTemplate = await this.http.get('assets/templates/report_road_work_activity.html', { responseType: 'text' })
        .toPromise();      

      let placeholders: any = {};

      let projectPerimeter = localStorage.getItem('projectPerimeter');       
      placeholders.PROJECT_PERIMETER = projectPerimeter;

      const today = new Date();      
      placeholders.DATE = today.toLocaleDateString();

      const nextSKS = today; nextSKS.setDate(today.getDate() + 14);
      placeholders.DATE_NEXT_SKS = nextSKS.toLocaleDateString();  

      const lastSKS = today; lastSKS.setDate(lastSKS.getDate() - 1);
      placeholders.DATE_LAST_SKS = lastSKS.toLocaleDateString();  

      const p = this.roadWorkActivity.properties;
      placeholders.UUID = p.uuid;
      placeholders.Projektnummer = p.projectNo
      placeholders.Titel = p.name;
      placeholders.Abschnitt = p.section;
      placeholders.Auslösegrund = p.description;
      placeholders.Bemerkung = p.comment;
      

      let assignedRoadWorkNeeds: any = this.needsOfActivityService.assignedRoadWorkNeeds.flatMap((item) => {
        return {
          'Titel & Abschnitt': item.properties.name,
          'Auslösegrund': item.properties.description,
          'Auslösende:r': item.properties.orderer.firstName + " " + item.properties.orderer.lastName, 
          'Werk': item.properties.orderer.organisationalUnit.abbreviation,
          ' Erstellt am': item.properties.created,
          'Wunschtermin': this.formatDate(item.properties.finishOptimumTo),
          'auslösend': item.properties.isPrimary ? 'Ja' : 'Nein'
        }
      });
      

      const htmlTable = this.generateHtmlTable(assignedRoadWorkNeeds);
             
       

      let filledHtml = this.fillPlaceholders(String(htmlTemplate), {
        'DATE': "***"+placeholders.DATE+"***",
        'DATE_NEXT_SKS': "***"+placeholders.DATE_NEXT_SKS+"***",
        'DATE_LAST_SKS': "***"+placeholders.DATE_LAST_SKS+"***",
        'PROJECT_PERIMETER': placeholders.PROJECT_PERIMETER,
        'TITEL_ADRESSE_ABSCHNITT': "***"+placeholders.Titel+"***",
        'TITEL_ADRESSE': "***"+placeholders.Titel+"***",
        'ABSCHNITT': "***"+placeholders.Abschnitt+"***",
        'SKS_NR': "***"+(today.getFullYear)+"/X ***",
        'ZUGEWIESENE_BEDARFE': htmlTable
      });


      
      
                 
/*                     

                <ng-container matColumnDef="org">
                    <th mat-header-cell *matHeaderCellDef> Werk </th>
                    <td mat-cell *matCellDef="let assignedRoadWorkNeed">
                        {{assignedRoadWorkNeed.properties.orderer.organisationalUnit.abbreviation}}
                    </td>
                </ng-container>

                <ng-container matColumnDef="optRealYears">
                    <th mat-header-cell *matHeaderCellDef> Wunschtermin </th>
                    <td mat-cell *matCellDef="let assignedRoadWorkNeed">
                        {{assignedRoadWorkNeed.properties.finishOptimumTo | date:'MM.yyyy'}}
                    </td>
                </ng-container>

                <ng-container matColumnDef="isOrigin">
                    <th mat-header-cell *matHeaderCellDef> auslösend </th>
                    <td mat-cell *matCellDef="let assignedRoadWorkNeed">
                        <mat-checkbox [checked]="assignedRoadWorkNeed.properties.isPrimary"
                            (change)="setAsPrimaryNeed(assignedRoadWorkNeed)"
                            style="margin:10px;" [disabled]="assignedRoadWorkNeed.properties.isPrimary">
                        </mat-checkbox>
                    </td>
                </ng-container>

                <ng-container matColumnDef="dateCreated">
                    <th mat-header-cell *matHeaderCellDef> Erstellt am </th>
                    <td mat-cell *matCellDef="let assignedRoadWorkNeed"> {{assignedRoadWorkNeed.properties.created |
                        date:'dd.MM.yyyy'}} </td>
                </ng-container>

                <ng-container matColumnDef="action">
                    <th mat-header-cell *matHeaderCellDef> Zuweisung aufheben </th>
                    <td mat-cell *matCellDef="let assignedRoadWorkNeed">
                        <mat-icon *ngIf="isInEditingMode" (click)="unAssignRoadWorkNeed(assignedRoadWorkNeed)"
                            aria-label="Zuweisung aufheben" class="arrow_button">arrow_downward</mat-icon>
                        <mat-icon *ngIf="!isInEditingMode" aria-label="Zuweisung aufheben nicht möglich"
                            style="color: rgb(155, 155, 155);">block</mat-icon>
                    </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="assignedActColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: assignedActColumns;"></tr>
            </table>
    </div>


    
 */      

    // Inject into hidden container
    const wrappedHtml = `
      <div style="width: 1000px; padding: 10px; font-family: Arial;">
        ${filledHtml}
      </div>
    `;
    
    this.reportContainer.nativeElement.innerHTML = wrappedHtml;
        
  
    
    await new Promise(resolve => setTimeout(resolve, 100));

    const target = this.reportContainer.nativeElement.firstElementChild as HTMLElement;
    
    if (!target || target.offsetWidth === 0 || target.offsetHeight === 0) {
      console.error('❌ Still no dimensions');
      return;
    }

    html2pdf()
      .from(target)
      .set({
        filename: 'Strategische Koordinationssitzung (SKS) -Vor-Protokoll.pdf',
        margin: 10,
        html2canvas: {
          scale: 2,
          useCORS: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .save();
  }

  fillPlaceholders(template: string, values: Record<string, string>): string {
    // Tworzymy wersję values z kluczami lowercase
    const normalizedValues: Record<string, string> = {};
    for (const key in values) {
      normalizedValues[key.toLowerCase()] = values[key];
    }

    // Zamieniamy placeholdery niezależnie od wielkości liter
    return template.replace(/\[PLACEHOLDER_([A-Z0-9_]+)\]/gi, (_, rawKey) => {
      const key = rawKey.toLowerCase();
      return normalizedValues[key] ?? `[PLACEHOLDER_${rawKey}]`;
    });
  }


  formatDate = (value: Date | string | undefined | null): string => {
      if (value === undefined || value === null) return "[Datum fehlt]";
      const d: Date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${day}.${month}.${d.getFullYear()}`;
  };

  generateHtmlTable(data: Record<string, string>[]): string {
  if (data.length === 0) return '<p>No data</p>';

  const headers = Object.keys(data[0]);

  let html = '<table style="font-size:10px" border="1" cellspacing="0" cellpadding="4"><thead><tr>';
  html += headers.map(h => `<th>${h}</th>`).join('');
  html += '</tr></thead><tbody>';

  html += data.map(row =>
    `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`
  ).join('');

  html += '</tbody></table>';

  return html;
}




}
