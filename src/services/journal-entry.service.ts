/**
 * @author Simon Meyer (GEOBOX AG)
 * @copyright Copyright (c) Stadt Winterthur. All rights reserved.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { JournalEntryFeature } from '../model/journal-entry-feature';

@Injectable({
    providedIn: 'root'
})
export class JournalEntryService {

    http: HttpClient;

    constructor(http: HttpClient) {
        this.http = http;
    }

    async getJournalEntries(roadWorkActivityUuid: string = ""): Promise<JournalEntryFeature[]> {
        let queryString = "/journalentries";

        if (roadWorkActivityUuid !== null && roadWorkActivityUuid !== "") {
            queryString += "?roadworkactivityuuid=" + roadWorkActivityUuid;
        }

        return await firstValueFrom(this.http.get<JournalEntryFeature[]>(environment.apiUrl + queryString).pipe(
            map((elem: JournalEntryFeature[]) => elem.map(JournalEntryFeature.fromJson))));
    }

    async addJournalEntry(journalEntry: JournalEntryFeature): Promise<any> {
        return await firstValueFrom(this.http.post<JournalEntryFeature>(environment.apiUrl + "/journalentries/", journalEntry));
    }

    async updateJournalEntry(journalEntry: JournalEntryFeature): Promise<any> {
        return await firstValueFrom(this.http.put<JournalEntryFeature>(environment.apiUrl + "/journalentries/", journalEntry));
    }
}
