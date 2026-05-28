import { Component, Input, OnInit } from '@angular/core';
import { RoadWorkActivityFeature } from '../../model/road-work-activity-feature';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-activity-properties',
  templateUrl: './activity-properties.component.html',
  styleUrls: ['./activity-properties.component.css']
})
export class ActivityPropertiesComponent implements OnInit {

  /** The road work activity features from the parent. */
  @Input() roadWorkActivityFeature!: RoadWorkActivityFeature;

  /** Project kinds from the parent. */
  @Input() projectKindOptions!: { value: string; label: string }[];

  /** Injected services stored for reuse in methods. */
  userService: UserService;

  constructor(userService: UserService) {
      this.userService = userService;
      }

  ngOnInit(): void {
  }

}
