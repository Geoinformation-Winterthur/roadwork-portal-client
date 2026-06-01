import { Component, Input, OnInit } from '@angular/core';
import { RoadWorkActivityFeature } from '../../model/road-work-activity-feature';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';
import { JournalEntryService } from '../../services/journal-entry.service';
import { JournalEntryFeature } from '../../model/journal-entry-feature';

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

  constructor(journalEntryService: JournalEntryService) {
    this.journalEntryService = journalEntryService;
  }

  ngOnInit() {
    this.refresh();
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
}
