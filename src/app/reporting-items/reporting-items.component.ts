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
import { ReportLoaderService } from 'src/services/report-loader.service';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-reporting-items',
  templateUrl: './reporting-items.component.html',
  styleUrls: ['./reporting-items.component.css']
})
export class ReportingItemsComponent implements OnInit {

  @Input()
  roadWorkActivity: RoadWorkActivityFeature = new RoadWorkActivityFeature();
  
  @Input()
  feedbackPhase: string = 'inconsult1';
  
  @Input()
  feedbackPhaseAccomplished: string = 'review';

  @Input()
  feedbackPhaseName: string = 'Phasenbezeichnung';
  
  consultationInput: ConsultationInput = new ConsultationInput();

  consultationInputsFromReporting: ConsultationInput[] = [];

  user: User;
  userService: UserService;

  isConsultationInputAllowed: boolean = false;
  isAssigningUsersAllowed: boolean = false;
  isAssigningUsersVisible: boolean = false;

  isPhaseConsulting: boolean = true;
  isPhaseReporting: boolean = false;


  availableUsers: User[] = [];

  needsOfActivityService: NeedsOfActivityService;

  statusHelper: StatusHelper;
  PdfDocumentHelper = PdfDocumentHelper;

  private consultationService: ConsultationService;
  private snckBar: MatSnackBar;
  private router: Router;

  private reportLoaderService: ReportLoaderService;

  columnDefs: ColDef[] = [
    {
      headerName: 'Werk',
      field: 'organisationalUnit.name',
      valueGetter: (params: any) => params.data?.organisationalUnit?.name || '',
      sortable: true,
      filter: true,
      flex: 1

    },
    {
      headerName: 'Kurzzeichen',
      field: 'organisationalUnit.abbreviation',
      valueGetter: (params: any) => params.data?.organisationalUnit?.abbreviation || '',
      sortable: true,
      filter: true,
      flex: 1

    },
    {
      headerName: 'Ansprechperson',
      valueGetter: (params: any) =>
        `${params.data?.firstName || ''} ${params.data?.lastName || ''}`.trim(),
      sortable: true,
      filter: true,
      flex: 1

    },
    {
      headerName: 'Zuweisen',
      cellRenderer: (params:any) => {
        const button = document.createElement('button');        
        button.style.fontSize = '18px';
        button.style.margin = '10px';
        button.style.border = 'none';
        button.style.background = 'transparent';        
        if (this.isAssigningUsersAllowed) {          
          button.textContent =  '🡅';
          button.style.cursor = 'pointer';
          button.addEventListener('click', () => {            
            this.addConsultation(params.data);          
          })
        } else {
          button.textContent = 'X';
          button.style.cursor = 'not-allowed';
        };
        return button;
      },
      width: 150,

    },
  ];

  defaultColDef = {      
    sortable: true,
    filter: true,
    resizable: true,
  };

    

  @ViewChild('reportContainer', { static: false }) reportContainer!: ElementRef;

  constructor(consultationService: ConsultationService,
    needsOfActivityService: NeedsOfActivityService,
    userService: UserService, 
    snckBar: MatSnackBar,    
    reportLoaderService: ReportLoaderService,
    router: Router) {
    this.consultationService = consultationService;
    this.needsOfActivityService = needsOfActivityService;
    this.userService = userService;
    this.user = userService.getLocalUser();
    this.snckBar = snckBar;
    this.statusHelper = new StatusHelper();
    this.reportLoaderService = reportLoaderService; 
    this.router = router;
  }

  ngOnInit(): void {

    if ((this.userService.getLocalUser().chosenRole === 'orderer' ||
        this.userService.getLocalUser().chosenRole === 'administrator') &&
        this.roadWorkActivity.properties.status==this.feedbackPhase ) {        
        this.isConsultationInputAllowed = true;        
    } else {
      this.isConsultationInputAllowed = false;
    }

    if ((this.userService.getLocalUser().chosenRole === 'territorymanager' ||
        this.userService.getLocalUser().chosenRole === 'administrator')
        && this.roadWorkActivity.properties.status == this.feedbackPhase
        ) {        
        this.isAssigningUsersAllowed = true;        
    } else {
      this.isAssigningUsersAllowed = false;
    }

    if (this.feedbackPhase == 'inconsult1' || this.feedbackPhase == 'verified1' || this.feedbackPhase == 'inconsult2' || this.feedbackPhase == 'verified2') {
      this.isPhaseConsulting = true;
      this.isPhaseReporting = false;
    } else {
      this.isPhaseConsulting = false;
      this.isPhaseReporting = true;
    }


    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.availableUsers = users;
      },
      error: (error) => {
      }
    });

    this.userService.getUserFromDB(this.userService.getLocalUser().mailAddress)
      .subscribe({
        next: (user) => {
          if (user && user.length > 0)
            this.user = user[0];
        },
        error: (error) => {
        }
      });

    this.consultationInput.feedbackPhase = this.feedbackPhase;

    this.consultationService.getConsultationInputs(this.roadWorkActivity.properties.uuid)
      .subscribe({
        next: (consultationInputs) => {
          let consultationInputsFromReportingTemp: ConsultationInput[] = [];
          for (let consultationInput of consultationInputs) {
            if (consultationInput.feedbackPhase === this.feedbackPhase) {
              consultationInputsFromReportingTemp.push(consultationInput);
            }
          }
          this.consultationInputsFromReporting = consultationInputsFromReportingTemp;

          const collator = new Intl.Collator('de-CH', { sensitivity: 'base', ignorePunctuation: true, numeric: true });

          // Sort by organisation (abbr), then by full name
          this.consultationInputsFromReporting = (this.consultationInputsFromReporting ?? [])
            .slice()
            .sort((a, b) => {
              const aOrg = a?.inputBy?.organisationalUnit?.abbreviation ?? '';
              const bOrg = b?.inputBy?.organisationalUnit?.abbreviation ?? '';

              const orgCmp = collator.compare(aOrg, bOrg);
              if (orgCmp !== 0) return orgCmp;

              const aName = `${a?.inputBy?.firstName ?? ''} ${a?.inputBy?.lastName ?? ''}`.trim();
              const bName = `${b?.inputBy?.firstName ?? ''} ${b?.inputBy?.lastName ?? ''}`.trim();

              return collator.compare(aName, bName);
          });


          for (let consultationInput of consultationInputs) {
            if (consultationInput.inputBy.mailAddress === this.user.mailAddress &&
              consultationInput.feedbackPhase === this.feedbackPhase) {
              this.consultationInput = new ConsultationInput();
              this.consultationInput.uuid = "" + consultationInput.uuid;
              this.consultationInput.ordererFeedback = "" + consultationInput.ordererFeedback;
              this.consultationInput.managerFeedback = "" + consultationInput.managerFeedback;
              this.consultationInput.inputBy = consultationInput.inputBy;
              this.consultationInput.lastEdit = consultationInput.lastEdit;
              this.consultationInput.decline = consultationInput.decline;
              this.consultationInput.valuation = consultationInput.valuation;
              this.consultationInput.feedbackPhase = this.feedbackPhase;
              break;
            }
          }

        },
        error: (error) => {
        }
      });
  }  

  updateComment(consultationInput: ConsultationInput) {
    
    consultationInput.feedbackGiven = consultationInput.ordererFeedback.trim().length > 0 ?  true : false;      

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

  
  async generatePDF2(): Promise<void> {    

    const html = await this.reportLoaderService.generateReport("report_roadwork_activity", this.roadWorkActivity.properties.uuid);
    this.reportContainer.nativeElement.innerHTML = html;

    this.snckBar.open("PDF wird generiert...", "", {
      duration: 4000
    });

    const target = this.reportContainer.nativeElement.firstElementChild as HTMLElement;

    if (!target || target.offsetWidth === 0 || target.offsetHeight === 0) {        
      return;
    }

    html2pdf().from(target)
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
 

  addConsultation(user: User): void {        
    this.consultationInput = new ConsultationInput();
    this.consultationInput.inputBy.mailAddress = user.mailAddress;
    this.consultationInput.feedbackPhase = this.feedbackPhase;
    this.consultationInput.lastEdit = new Date();
    this.consultationInput.decline = false;
    this.consultationInput.valuation = 0;
    this.consultationInput.ordererFeedback = "";
    this.consultationInput.managerFeedback = "";
    this.consultationInput.uuid = "";
    this.consultationInput.inputBy = user;

    if (this.consultationInputsFromReporting.some(u => u.inputBy.uuid === user.uuid)) {
      this.snckBar.open("Vernehmlassende:r ist schon in der Liste.", undefined, {
        duration: 3000,
        panelClass: ['snackbar-warning']
      });
      return;
    }


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
                this.snckBar.open("Beteiligte gespeichert", "", {
                  duration: 4000
                });
              }
              let consultationInputObj: ConsultationInput = new ConsultationInput();
              consultationInputObj.uuid = "" + consultationInput.uuid;
              consultationInputObj.ordererFeedback = "" + consultationInput.ordererFeedback;
              consultationInputObj.managerFeedback = "" + consultationInput.managerFeedback;
              consultationInputObj.inputBy = consultationInput.inputBy;
              consultationInputObj.feedbackPhase = this.feedbackPhase;
              consultationInputObj.lastEdit = consultationInput.lastEdit;
              consultationInputObj.decline = consultationInput.decline;
              consultationInputObj.valuation = consultationInput.valuation;

              this.consultationInputsFromReporting.push(consultationInputObj);

              this.ngOnInit();
            }
          },
          error: (error) => {
            this.snckBar.open("Unbekannter Fehler beim Speichern der Rückmeldung", "", {
              duration: 4000
            });
          }
        });        
  }

  deleteConsultation(inputByUuid: string): void {    
     this.consultationService.deleteConsultationInput(this.roadWorkActivity.properties.uuid, inputByUuid, this.feedbackPhase)
      .subscribe({
        next: (error) => {
          if (error) {
            ErrorMessageEvaluation._evaluateErrorMessage(error);
            if (error.errorMessage.trim().length !== 0) {
              this.snckBar.open(error.errorMessage, "", {
                duration: 4000
              });
            } else {
              this.snckBar.open("Bemerkung wurde gelöscht", "", {
                duration: 4000
              });
            }
          }
        },
        error: (error) => {
          this.snckBar.open("Unbekannter Fehler beim Löschen der Bemerkung", "", {
            duration: 4000
          });
        }
      });
    this.ngOnInit();
  }      

  createNewNeed() {
    let protoNeed: RoadWorkNeedFeature | undefined;
    for (let needOfActivity of this.needsOfActivityService.assignedRoadWorkNeeds) {
      protoNeed = needOfActivity;
      if (needOfActivity.properties.isPrimary)
        break;
    }
    if (protoNeed) {
      let params = {
        finishEarlyTo: protoNeed.properties.finishEarlyTo,
        finishOptimumTo: protoNeed.properties.finishOptimumTo,
        finishLateTo: protoNeed.properties.finishLateTo,
        coordinates: RoadworkPolygon.coordinatesToString(protoNeed.geometry.coordinates)
      };
      this.router.navigate(["/needs/new"], { queryParams: params });
    }
  }

}
