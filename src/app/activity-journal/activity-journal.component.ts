import { Component, Input, OnInit } from '@angular/core';
import { RoadWorkActivityFeature } from '../../model/road-work-activity-feature';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';
import { JournalEntryService } from '../../services/journal-entry.service';
import { JournalEntryFeature } from '../../model/journal-entry-feature';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { DateHelper } from 'src/helper/date-helper';

@Component({
  selector: 'app-activity-journal',
  templateUrl: './activity-journal.component.html',
  styleUrls: ['./activity-journal.component.css']
})
export class ActivityJournalComponent implements OnInit {

  /** The road work activity features from the parent. */
  @Input() roadWorkActivityFeature!: RoadWorkActivityFeature;
  /** The road work needs features assigned to the activity features from the parent. */
  @Input() assignedRoadWorkNeeds!: RoadWorkNeedFeature[];

  private journalEntryService: JournalEntryService;
  public journalEntryFeatures: JournalEntryFeature[] = [];

  public approvalRequiredExpanded: Boolean = false;
  public partOfAggloprogramExpanded: Boolean = false;
  public prestudyExpanded: Boolean = false;
  public affectedInfrastructureExpanded: Boolean = true;
  public privateEntityAffectedExpanded: Boolean = false;
  public provisExpanded: Boolean = true;
  public projectPlanningExpanded: Boolean = true;
  public issueApprovalExpanded: Boolean = true;

  constructor(journalEntryService: JournalEntryService) {
    this.journalEntryService = journalEntryService;
  }

  ngOnInit() {
    this.refresh();

    this.approvalRequiredExpanded = this.roadWorkActivityFeature.properties.approvals.approvalRequired;
    this.partOfAggloprogramExpanded = this.roadWorkActivityFeature.properties.partOfAggloprogram;
    this.prestudyExpanded = this.roadWorkActivityFeature.properties.prestudy;
    this.privateEntityAffectedExpanded = this.roadWorkActivityFeature.properties.privateEntityAffected;
    this.projectPlanningExpanded = !this.roadWorkActivityFeature.properties.gisUpdated;
    this.issueApprovalExpanded = !this.roadWorkActivityFeature.properties.filedInFabasoft;
  }

  async refresh() {
    this.journalEntryFeatures = await this.journalEntryService.getJournalEntries(this.roadWorkActivityFeature.properties.uuid);
    // Add an empty one (new)
    const newJournalEntry = new JournalEntryFeature();
    newJournalEntry.properties.isEditingAllowed = true;
    newJournalEntry.properties.uuidRoadworkActivity = this.roadWorkActivityFeature.properties.uuid;
    this.journalEntryFeatures.push(newJournalEntry);
  }

  async save() {
    // insert new feature (only last)
    const newJournalEntry = this.journalEntryFeatures[this.journalEntryFeatures.length - 1];
    if (newJournalEntry.properties.isChanged()) {
      await this.journalEntryService.addJournalEntry(newJournalEntry);
    }

    // update existing entries (all but last)
    for (const journalEntryFeature of this.journalEntryFeatures.slice(0, -1)) {
      if (journalEntryFeature.properties.isChanged()) {
        await this.journalEntryService.updateJournalEntry(journalEntryFeature);
      }
    }

    // reload elements
    await this.refresh();
  }

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  onAClick(event: MouseEvent, url: string) {
    if (!this.isValidUrl(url)) {
      event.preventDefault();
      return;
    }
  }

  onApprovalRequiredCollapseClick() {
    this.approvalRequiredExpanded = !this.approvalRequiredExpanded;
  }

  onApprovalRequiredChange() {
    this.approvalRequiredExpanded = this.roadWorkActivityFeature.properties.approvals.approvalRequired;
  }

  onPartOfAggloprogramCollapseClick() {
    this.partOfAggloprogramExpanded = !this.partOfAggloprogramExpanded;
  }

  onPartOfAggloprogramChange() {
    this.partOfAggloprogramExpanded = this.roadWorkActivityFeature.properties.partOfAggloprogram;
  }

  onPrestudyCollapseClick() {
    this.prestudyExpanded = !this.prestudyExpanded;
  }

  onPrestudyChange() {
    this.prestudyExpanded = this.roadWorkActivityFeature.properties.prestudy;
  }

  onAffectedInfrastructureCollapseClick() {
    this.affectedInfrastructureExpanded = !this.affectedInfrastructureExpanded;
  }

  onPrivateEntityAffectedCollapseClick() {
    this.privateEntityAffectedExpanded = !this.privateEntityAffectedExpanded;
  }

  onPrivateEntityAffectedChange() {
    this.privateEntityAffectedExpanded = this.roadWorkActivityFeature.properties.privateEntityAffected;
  }

  onProvisCollapseClick() {
    this.provisExpanded = !this.provisExpanded;
  }

  onProjectPlanningCollapseClick() {
    this.projectPlanningExpanded = !this.projectPlanningExpanded;
  }

  onIssueApprovalCollapseClick() {
    this.issueApprovalExpanded = !this.issueApprovalExpanded;
  }

  normalizeDate(event: MatDatepickerInputEvent<Date>): void {
    return DateHelper.normalizeDate(event);
  }

  private getDateNowOrUndefined(checkedField: boolean): Date | undefined {
    if (checkedField)
    {
      return DateHelper.getNormalizedDateNow(); // avoid date change due to timezone, see date-helper.normalizeDate
    }
    else
    {
      return undefined;
    }
  }

  onCoreDrillingContractedChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.dateCoreDrillingContracted =
        this.getDateNowOrUndefined(this.roadWorkActivityFeature.properties.coreDrillingContracted);
    }
  }

  onQuotesRequestedChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.dateQuotesRequested =
        this.getDateNowOrUndefined(this.roadWorkActivityFeature.properties.quotesRequested);
    }
  }

  onQuotesReviewedChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.dateQuotesReviewed =
        this.getDateNowOrUndefined(this.roadWorkActivityFeature.properties.quotesReviewed);
    }
  }

  onStaffResourcesAprConfirmedChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.dateStaffResourcesAprConfirmed =
        this.getDateNowOrUndefined(this.roadWorkActivityFeature.properties.staffResourcesAprConfirmed);
    }
  }

  onCostEstimateAprConfirmedChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.dateCostEstimateAprConfirmed =
        this.getDateNowOrUndefined(this.roadWorkActivityFeature.properties.costEstimateAprConfirmed);
    }
  }

  onAfmCheckedChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.dateAfmChecked =
        this.getDateNowOrUndefined(this.roadWorkActivityFeature.properties.afmChecked);
    }
  }

  onGisUpdatedChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.dateGisUpdated =
        this.getDateNowOrUndefined(this.roadWorkActivityFeature.properties.gisUpdated);

      this.projectPlanningExpanded = !this.roadWorkActivityFeature.properties.gisUpdated;
    }
  }

  onPreReviewedByCfChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.datePreReviewedByCf =
        this.getDateNowOrUndefined(this.roadWorkActivityFeature.properties.preReviewedByCf);
    }
  }

  onPreReviewedByRdChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.datePreReviewedByRd =
        this.getDateNowOrUndefined(this.roadWorkActivityFeature.properties.preReviewedByRd);
    }
  }

  onFormallyApprovedChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.dateFormallyApproved =
        this.getDateNowOrUndefined(this.roadWorkActivityFeature.properties.formallyApproved);
    }
  }

  onFiledInFabasoftChange() {
    if (this.roadWorkActivityFeature) {
      this.roadWorkActivityFeature.properties.dateFiledInFabasoft =
        this.getDateNowOrUndefined(this.roadWorkActivityFeature.properties.filedInFabasoft);

      this.issueApprovalExpanded = !this.roadWorkActivityFeature.properties.filedInFabasoft;
    }
  }
}
