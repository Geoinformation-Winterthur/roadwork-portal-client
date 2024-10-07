import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { RoadWorkActivityService } from 'src/services/roadwork-activity.service';

@Component({
  selector: 'app-delete-activity-dialog',
  templateUrl: './delete-activity-dialog.component.html',
  styleUrls: ['./delete-activity-dialog.component.css']
})
export class DeleteActivityDialogComponent {

  public deleteReason: string = "";

  private roadWorkActivityUuid: string;

  private deleteDialogRef: MatDialogRef<DeleteActivityDialogComponent>;
  private roadWorkActivityService: RoadWorkActivityService;
  private snckBar: MatSnackBar;
  private router: Router;

  constructor(@Inject(MAT_DIALOG_DATA) data: {roadWorkActivityUuid: string},
      deleteDialogRef: MatDialogRef<DeleteActivityDialogComponent>,
      roadWorkActivityService: RoadWorkActivityService, snckBar: MatSnackBar,
      router: Router) {
    this.deleteDialogRef = deleteDialogRef;
    this.roadWorkActivityService = roadWorkActivityService;
    this.snckBar = snckBar;
    this.router = router;
    this.roadWorkActivityUuid = data.roadWorkActivityUuid;
  }

  closeDialog() {
    this.deleteDialogRef.close();
  }

  deleteRoadworkActivity() {
    this.roadWorkActivityService.deleteRoadWorkActivity(this.roadWorkActivityUuid, this.deleteReason).subscribe({
      next: (errorMessage) => {
        if (errorMessage != null && errorMessage.errorMessage != null &&
          errorMessage.errorMessage.trim().length !== 0) {
          ErrorMessageEvaluation._evaluateErrorMessage(errorMessage);
          this.snckBar.open(errorMessage.errorMessage, "", {
            duration: 4000
          });
        } else {
          this.deleteDialogRef.close();
          this.router.navigate(["/activities/"]);
          this.snckBar.open("Bauvorhaben wurde gelöscht", "", {
            duration: 4000,
          });
        }
      },
      error: (error) => {
      }
    });
  }

}
