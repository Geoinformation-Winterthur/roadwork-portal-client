import { Component, Input, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { StatusHelper } from 'src/helper/status-helper';
import { ConsultationInput } from 'src/model/consultation-input';
import { User } from 'src/model/user';
import { ConsultationService } from 'src/services/consultation.service';
import { NeedsOfActivityService } from 'src/services/needs-of-activity.service';
import { UserService } from 'src/services/user.service';

@Component({
  selector: 'app-consultation-items',
  templateUrl: './consultation-items.component.html',
  styleUrls: ['./consultation-items.component.css']
})
export class ConsultationItemsComponent implements OnInit {

  @Input()
  roadworkActivityUuid: string = "";

  @Input()
  roadworkActivityStatus: string = "";

  consultationInput: ConsultationInput = new ConsultationInput();

  consultationInputsFromInConsult: ConsultationInput[] = [];

  tableDisplayedColumns: string[] = ['name', 'date_last_change', 'has_feedback', 'feedback', 'valuation', 'consult_input'];

  user: User;
  userService: UserService;

  needsOfActivityService: NeedsOfActivityService;

  statusHelper: StatusHelper;

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

    this.consultationInput.feedbackPhase = this.roadworkActivityStatus;

    this.consultationService.getConsultationInputs(this.roadworkActivityUuid)
      .subscribe({
        next: (consultationInputs) => {
          let consultationInputsFromInConsultTemp: ConsultationInput[] = []
          for (let consultationInput of consultationInputs) {
            if (consultationInput.feedbackPhase === 'inconsult') {
              consultationInputsFromInConsultTemp.push(consultationInput);
            }
          }
          this.consultationInputsFromInConsult = consultationInputsFromInConsultTemp;

          for (let consultationInput of consultationInputs) {
            if (consultationInput.inputBy.mailAddress === this.user.mailAddress &&
              consultationInput.feedbackPhase === this.roadworkActivityStatus) {
              this.consultationInput = new ConsultationInput();
              this.consultationInput.uuid = "" + consultationInput.uuid;
              this.consultationInput.ordererFeedback = "" + consultationInput.ordererFeedback;
              this.consultationInput.inputBy = consultationInput.inputBy;
              this.consultationInput.managerFeedback = "" + consultationInput.managerFeedback;
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

  sendInConsult() {
    this.consultationInput.feedbackGiven = true;
    if (this.consultationInput.uuid === "") {
      this.consultationService.addConsultationInput(this.roadworkActivityUuid,
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
              consultationInputObj.inputBy = consultationInput.inputBy;
              consultationInputObj.managerFeedback = "" + consultationInput.managerFeedback;
              consultationInputObj.feedbackPhase = consultationInput.feedbackPhase;
              consultationInputObj.lastEdit = consultationInput.lastEdit;
              consultationInputObj.decline = consultationInput.decline;
              consultationInputObj.valuation = consultationInput.valuation;
              consultationInputObj.feedbackGiven = consultationInput.feedbackGiven;

              this.consultationInputsFromInConsult.push(consultationInputObj);
            }
          },
          error: (error) => {
            this.snckBar.open("Unbekannter Fehler beim Speichern der Rückmeldung", "", {
              duration: 4000
            });
          }
        });
    } else {
      this.consultationService.updateConsultationInput(this.roadworkActivityUuid,
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
    this.consultationService.updateConsultationInput(this.roadworkActivityUuid,
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

  setDecline() {
    if (this.consultationInput.decline) {
      this.consultationInput.valuation = 0;
      this.consultationInput.ordererFeedback = "";
    }
  }

}
