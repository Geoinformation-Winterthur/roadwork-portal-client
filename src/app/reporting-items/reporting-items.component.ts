import { Component, Input, OnInit } from '@angular/core';
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

  constructor(consultationService: ConsultationService,
    needsOfActivityService: NeedsOfActivityService,
    userService: UserService, snckBar: MatSnackBar) {
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

}
