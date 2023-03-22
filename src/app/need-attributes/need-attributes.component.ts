import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { RoadWorkNeedService } from 'src/services/roadwork-need.service';
import { UserService } from 'src/services/user.service';
import { User } from 'src/model/user';
import { RoadWorkNeedFeature } from '../../model/road-work-need-feature';
import Polygon from 'ol/geom/Polygon';
import { RoadworkPolygon } from 'src/model/road-work-polygon';
import { FormControl } from '@angular/forms';
import { RoadWorkNeedEnum } from 'src/model/road-work-need-enum';

@Component({
  selector: 'app-need-attributes',
  templateUrl: './Need-attributes.component.html',
  styleUrls: ['./need-attributes.component.css']
})
export class NeedAttributesComponent implements OnInit {

  roadWorkNeedFeature?: RoadWorkNeedFeature;
  orderer: User = new User();
  ordererOrgUnitName: string = "";
  areaManagerName: string = "";
  statusCode: string = "";
  priorityCode: string = "";

  userService: UserService;

  roadWorkNeedEnumControl: FormControl = new FormControl();
  availableRoadWorkNeedEnums: RoadWorkNeedEnum[] = [];

  private roadWorkNeedService: RoadWorkNeedService;
  private activatedRoute: ActivatedRoute;
  private activatedRouteSubscription: Subscription = new Subscription();


  constructor(activatedRoute: ActivatedRoute, roadWorkNeedService: RoadWorkNeedService,
        userService: UserService) {
    this.activatedRoute = activatedRoute;
    this.roadWorkNeedService = roadWorkNeedService;
    this.userService = userService;
  }

  ngOnInit() {
    this.activatedRouteSubscription = this.activatedRoute.params
      .subscribe(params => {
        let idParamString: string = params['id'];

        if(idParamString == "new"){

          this.roadWorkNeedFeature = new RoadWorkNeedFeature();
          this.roadWorkNeedFeature.properties.status.code = "notcoord";
          this.roadWorkNeedFeature.properties.priority.code = "middle";

        } else {

          let constProjId: string = params['id'];

          this.roadWorkNeedService.getRoadWorkNeeds(constProjId)
                  .subscribe({
            next: (roadWorkNeeds) => {
              if(roadWorkNeeds.length === 1){
                let roadWorkNeed: any = roadWorkNeeds[0];
                let rwPoly: RoadworkPolygon = new RoadworkPolygon();
                rwPoly.coordinates = roadWorkNeed.geometry.coordinates
                roadWorkNeed.geometry = rwPoly;
                this.roadWorkNeedFeature = roadWorkNeed;
                let roadWorkNeedFeature: RoadWorkNeedFeature = this.roadWorkNeedFeature as RoadWorkNeedFeature;
                if(!this._hasOnRoadWorkNeedEnumElementAlready(roadWorkNeedFeature.properties.kind)){
                  this.availableRoadWorkNeedEnums.push(roadWorkNeedFeature.properties.kind);
                }
                this.roadWorkNeedEnumControl.setValue(roadWorkNeedFeature.properties.kind.code);
              }    
            },
            error: (error) => {
            }});

        }

      });

      this.roadWorkNeedService.getAllTypes().subscribe({
        next: (roadWorkNeedTypes) => {
          for (let roadWorkNeedType of roadWorkNeedTypes) {
            if(!this._hasOnRoadWorkNeedEnumElementAlready(roadWorkNeedType)){
              this.availableRoadWorkNeedEnums.push(roadWorkNeedType);
            }
          }
        },
        error: (error) => {
        }
      });

  }

  add(){
    this.roadWorkNeedService.addRoadworkNeed(this.roadWorkNeedFeature)
            .subscribe({
              next: (roadWorkNeedFeature) => {
                if(this.roadWorkNeedFeature){
                  this.roadWorkNeedFeature.properties.uuid = roadWorkNeedFeature.properties.uuid;
                  this.roadWorkNeedFeature.properties.orderer = roadWorkNeedFeature.properties.orderer;
                  this.roadWorkNeedFeature.properties.managementarea = roadWorkNeedFeature.properties.managementarea;
                }
              },
              error: (error) => {
              }
            });
  }

  save()
  {
    this.roadWorkNeedService.updateRoadWorkNeed(this.roadWorkNeedFeature)
    .subscribe({
      next: (roadWorkNeedFeature) => {
        if(this.roadWorkNeedFeature){
          this.roadWorkNeedFeature.properties.managementarea = roadWorkNeedFeature.properties.managementarea;
        }
      },
      error: (error) => {
      }
    });
  }

  validateElement1() {
    let validateButton1 = document.getElementById("validateButton1");
    if(validateButton1 != null)
      validateButton1.style.backgroundColor = "lightgreen";
    let expansionPanel1 = document.getElementById("expansionPanel1");
    if(expansionPanel1 != null)
      expansionPanel1.style.backgroundColor = "rgb(238, 255, 238)";
  }

  validateElement3() {
    let validateButton3 = document.getElementById("validateButton3");
    if(validateButton3 != null)
      validateButton3.style.backgroundColor = "lightgreen";
    let expansionPanel3 = document.getElementById("expansionPanel3");
    if(expansionPanel3 != null)
      expansionPanel3.style.backgroundColor = "rgb(238, 255, 238)";
    // this.validateElement2();
  }

  validateElement4() {
    let validateButton4 = document.getElementById("validateButton4");
    if(validateButton4 != null)
      validateButton4.style.backgroundColor = "lightgreen";
    let expansionPanel4 = document.getElementById("expansionPanel4");
    if(expansionPanel4 != null)
      expansionPanel4.style.backgroundColor = "rgb(238, 255, 238)";
    this.validateElement2();
  }

  validateElement2() {
    let validateButton3 = document.getElementById("validateButton3");
    let validateButton4 = document.getElementById("validateButton4");
    if (validateButton3!= null && validateButton3.style.backgroundColor === "lightgreen" &&
      validateButton4 != null && validateButton4.style.backgroundColor === "lightgreen") {
      let expansionPanel2 = document.getElementById("expansionPanel2");
      if(expansionPanel2 != null)
        expansionPanel2.style.backgroundColor = "rgb(238, 255, 238)";
    }
  }

  onRoadWorkNeedEnumChange() {
    if(this.roadWorkNeedFeature){
      this.roadWorkNeedFeature.properties.kind.code = this.roadWorkNeedEnumControl.value;
    }
  }

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
  }

  private _hasOnRoadWorkNeedEnumElementAlready(roadWorkNeedEnum: RoadWorkNeedEnum): boolean {
    for(let availableRoadWorkNeedEnum of this.availableRoadWorkNeedEnums){
      if(availableRoadWorkNeedEnum.code === roadWorkNeedEnum.code){
        return true;
      }
    }
    return false;
  }

}
