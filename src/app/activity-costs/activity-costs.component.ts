import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { RoadWorkActivityFeature } from '../../model/road-work-activity-feature';
import { RoadWorkNeedFeature } from 'src/model/road-work-need-feature';
import { Costs } from 'src/model/costs';
import { CostsService } from '../../services/costs.service';
import { ErrorMessageEvaluation } from 'src/helper/error-message-evaluation';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-activity-costs',
  templateUrl: './activity-costs.component.html',
  styleUrls: ['./activity-costs.component.css']
})
export class ActivityCostsComponent implements OnInit {

  /** The road work activity features from the parent. */
  @Input() roadWorkActivityFeature!: RoadWorkActivityFeature;
  /** The road work needs features assigned to the activity features from the parent. */
  @Input() assignedRoadWorkNeeds!: RoadWorkNeedFeature[];

  private costsService: CostsService;
  private snckBar: MatSnackBar;

  /** Data for selectors and lookups in the form. */
  costsOfAssignedNeeds: Costs[] = [];

  roadWorkNeedsCostsColumns: string[] = ["created", "org", "orderer", "name", "comment", "cost_type", "costs", "erp_number"];

  constructor(costsService: CostsService, snckBar: MatSnackBar) {
    this.costsService = costsService;
    this.snckBar = snckBar;
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['assignedRoadWorkNeeds']) {
      this.initCosts();
    }
  }

  initCosts(): void {
    let costsOfAssignedNeedsTemp: Costs[] = [];
    
    for (let assignedRoadWorkNeed of this.assignedRoadWorkNeeds) {
      if (assignedRoadWorkNeed.properties.costs)
        for (let costs of assignedRoadWorkNeed.properties.costs)
          costsOfAssignedNeedsTemp.push(costs);
    }
    this.costsOfAssignedNeeds = costsOfAssignedNeedsTemp;
  }

  /** Finds which assigned need a given cost item belongs to. */
  getAssignedNeedForCost(cost: Costs): RoadWorkNeedFeature {
    for (let assignedRoadWorkNeed of this.assignedRoadWorkNeeds)
      if (assignedRoadWorkNeed.properties.costs)
        for (let tempCost of assignedRoadWorkNeed.properties.costs)
          if (tempCost.uuid == cost.uuid)
            return assignedRoadWorkNeed;
    return new RoadWorkNeedFeature();
  }

  /** Sums all cost items associated with assigned needs (NaN-safe). */
  get totalCosts(): number {
    return this.costsOfAssignedNeeds
      .reduce((sum, c) => sum + (c?.costs ?? 0), 0);
  }

    /**
     * Persist changes to a costs.
     * - Calls backend; shows normalized error or success via snackbar.
     */
    updateProvisNr(costs: Costs) {
      this.costsService.updateCosts(costs)
        .subscribe({
          next: (costs) => {
            if (costs) {
              ErrorMessageEvaluation._evaluateErrorMessage(costs);
              if (costs.errorMessage.trim().length !== 0) {
                this.snckBar.open(costs.errorMessage, "", {
                  duration: 4000
                });
              } else {
                this.snckBar.open("Projekt-Nr gespeichert", "", {
                  duration: 4000
                });
              }
            }
          },
          error: (error) => {
            this.snckBar.open("Unbekannter Fehler beim Speichern der Projekt-Nr", "", {
              duration: 4000
            });
          }
        });
  
    }
}