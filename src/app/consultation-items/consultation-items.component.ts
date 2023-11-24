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

  needInput: ConsultationInput = new ConsultationInput();
  feedbackInput: ConsultationInput = new ConsultationInput();

  user: User;

  consultationInputs: ConsultationInput[] = [];

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

    this.consultationService.getConsultationInputs(this.roadworkActivityUuid)
      .subscribe({
        next: (consultationInputs) => {
          this.consultationInputs = consultationInputs;

          for (let consultationInput of consultationInputs) {
            if (consultationInput.inputBy.mailAddress === this.user.mailAddress)
              this.needInput = consultationInputs[0];
          }

        },
        error: (error) => {
        }
      });
  }

  update() {
    if (this.needInput.uuid === "") {
      this.consultationService.addConsultationInput(this.roadworkActivityUuid,
        this.needInput)
        .subscribe({
          next: (consultationInput) => {
            if (consultationInput) {
              ErrorMessageEvaluation._evaluateErrorMessage(consultationInput);
              if (consultationInput.errorMessage.trim().length !== 0) {
                this.snckBar.open(consultationInput.errorMessage, "", {
                  duration: 4000
                });
              }
              this.needInput = consultationInput;
            }
          },
          error: (error) => {
          }
        });
    } else {
      this.consultationService.updateConsultationInput(this.roadworkActivityUuid,
            this.needInput)
        .subscribe({
          next: (consultationInput) => {
            if (consultationInput) {
              ErrorMessageEvaluation._evaluateErrorMessage(consultationInput);
              if (consultationInput.errorMessage.trim().length !== 0) {
                this.snckBar.open(consultationInput.errorMessage, "", {
                  duration: 4000
                });
              }
              this.needInput = consultationInput;
            }
          },
          error: (error) => {
          }
        });
    }
  }

}
