import { Component, Input, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
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
  consultationInputsFromReporting: ConsultationInput[] = [];

  user: User;

  needsOfActivityService: NeedsOfActivityService;

  private consultationService: ConsultationService;
  private snckBar: MatSnackBar;

  constructor(consultationService: ConsultationService,
    needsOfActivityService: NeedsOfActivityService,
    userService: UserService, snckBar: MatSnackBar) {
    this.consultationService = consultationService;
    this.needsOfActivityService = needsOfActivityService;
    this.user = userService.getLocalUser();
    this.snckBar = snckBar;
  }

  ngOnInit(): void {

    this.consultationInput.feedbackPhase = this.roadworkActivityStatus;

    this.consultationService.getConsultationInputs(this.roadworkActivityUuid)
      .subscribe({
        next: (consultationInputs) => {
          for (let consultationInput of consultationInputs) {
            if(consultationInput.feedbackPhase === 'inconsult'){
              this.consultationInputsFromInConsult.push(consultationInput);
            }
            if(consultationInput.feedbackPhase === 'reporting'){
              this.consultationInputsFromReporting.push(consultationInput);
            }
          }

          for (let consultationInput of consultationInputs) {
            if (consultationInput.inputBy.mailAddress === this.user.mailAddress &&
                  consultationInput.feedbackPhase === this.roadworkActivityStatus){
              this.consultationInput = new ConsultationInput();
              this.consultationInput.uuid = "" + consultationInput.uuid;
              this.consultationInput.inputText = "" + consultationInput.inputText;
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

  sendInConsult() {
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
              }
              this.consultationInput = new ConsultationInput();
              this.consultationInput.uuid = "" + consultationInput.uuid;
              this.consultationInput.inputText = "" + consultationInput.inputText;
              this.consultationInput.inputBy = consultationInput.inputBy;
              this.consultationInput.lastEdit = consultationInput.lastEdit;
              this.consultationInput.decline = consultationInput.decline;
              this.consultationInput.valuation = consultationInput.valuation;
            }
          },
          error: (error) => {
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
              }
              this.consultationInput = new ConsultationInput();
              this.consultationInput.uuid = "" + consultationInput.uuid;
              this.consultationInput.inputText = "" + consultationInput.inputText;
              this.consultationInput.inputBy = consultationInput.inputBy;
              this.consultationInput.lastEdit = consultationInput.lastEdit;
              this.consultationInput.decline = consultationInput.decline;
              this.consultationInput.valuation = consultationInput.valuation;
            }
          },
          error: (error) => {
          }
        });
    }
  }

  sendReporting() {
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
              }
              this.consultationInput = new ConsultationInput();
              this.consultationInput.uuid = "" + consultationInput.uuid;
              this.consultationInput.inputText = "" + consultationInput.inputText;
              this.consultationInput.inputBy = consultationInput.inputBy;
              this.consultationInput.lastEdit = consultationInput.lastEdit;
              this.consultationInput.decline = consultationInput.decline;
              this.consultationInput.valuation = consultationInput.valuation;
            }
          },
          error: (error) => {
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
              }
              this.consultationInput = new ConsultationInput();
              this.consultationInput.uuid = "" + consultationInput.uuid;
              this.consultationInput.inputText = "" + consultationInput.inputText;
              this.consultationInput.inputBy = consultationInput.inputBy;
              this.consultationInput.lastEdit = consultationInput.lastEdit;
              this.consultationInput.decline = consultationInput.decline;
              this.consultationInput.valuation = consultationInput.valuation;
            }
          },
          error: (error) => {
          }
        });
    }
  }

}
