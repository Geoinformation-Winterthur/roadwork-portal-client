/**
 * @author Simon Meyer (GEOBOX AG)
 * @copyright Copyright (c) Stadt Winterthur. All rights reserved.
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { Costs } from '../model/costs';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CostsService {

    http: HttpClient;

    constructor(http: HttpClient) {
        this.http = http;
    }

    updateCosts(costs: Costs): Observable<Costs> {
        return this.http.put<Costs>(environment.apiUrl + "/costs/", costs);
    }
}
