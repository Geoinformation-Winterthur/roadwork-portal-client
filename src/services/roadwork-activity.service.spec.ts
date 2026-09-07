import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { RoadWorkActivityFeature } from 'src/model/road-work-activity-feature';

import { RoadWorkActivityService } from './roadwork-activity.service';

describe('RoadWorkActivityService', () => {
  let service: RoadWorkActivityService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(RoadWorkActivityService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('does not send activityHistory when updating an activity', () => {
    const activity = new RoadWorkActivityFeature();
    activity.properties.activityHistory = [{
      uuid: 'history-1',
      lastName: '',
      changeDate: new Date(),
      who: 'Test User',
      what: 'Test change',
      userComment: '',
      hideDate: false
    }];

    service.updateRoadWorkActivity(activity).subscribe();

    const request = httpTestingController.expectOne(
      environment.apiUrl + '/roadworkactivity/');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.properties.activityHistory).toBeUndefined();
    expect(activity.properties.activityHistory.length).toBe(1);
    request.flush(activity);
  });
});
