import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { RoadWorkProjectService } from 'src/services/roadwork_project.service';
import { UserService } from 'src/services/user.service';
import { RoadWorkProjectFeature } from '../../model/road-work-project-feature';

@Component({
  selector: 'app-project-attributes',
  templateUrl: './project-attributes.component.html',
  styleUrls: ['./project-attributes.component.css']
})
export class ProjectAttributesComponent implements OnInit {

  roadWorkProjectFeature: RoadWorkProjectFeature = new RoadWorkProjectFeature();

  private constructionProjectService: RoadWorkProjectService;
  isConstructionProjectServiceOnline: boolean = false;

  username: FormControl = new FormControl('', [Validators.required]);
  email: FormControl = new FormControl('', [Validators.required, Validators.email]);
  passphrase: FormControl = new FormControl('', [Validators.required]);

  pressCheckBox: boolean = false;
  internetCheckBox: boolean = false;
  civilEngineeringCheckBox: boolean = false;
  lightSignalCheckBox: boolean = false;
  checkBox2: boolean = false;
  checkBox3: boolean = false;

  panel1Open: boolean = false;
  panel2Open: boolean = false;
  panel3Open: boolean = false;
  panel4Open: boolean = false;

  playDeviceOid: FormControl = new FormControl('', [Validators.required]);
  nameControl: FormControl = new FormControl('', [Validators.required]);

  userService: UserService;

  private activatedRoute: ActivatedRoute;
  private activatedRouteSubscription: Subscription = new Subscription();

  constructor(activatedRoute: ActivatedRoute, constructionProjectService: RoadWorkProjectService,
        userService: UserService) {
    this.activatedRoute = activatedRoute;
    this.constructionProjectService = constructionProjectService;
    this.userService = userService;    
  }

  ngOnInit() {
    this.activatedRouteSubscription = this.activatedRoute.params
      .subscribe(params => {
        let constProjId: number = parseInt(params['id']);

        this.constructionProjectService.getConstructionProjectById(constProjId).subscribe(
          constructionprojectData => {
            let constructionprojectObs: RoadWorkProjectFeature
              = constructionprojectData as RoadWorkProjectFeature;
    
            this.roadWorkProjectFeature = constructionprojectObs;
            this.playDeviceOid.setValue(this.roadWorkProjectFeature.properties.id);
            this.nameControl.setValue(this.roadWorkProjectFeature.properties.place);
  
            this.isConstructionProjectServiceOnline = true;
    
          }, error => {
            this.isConstructionProjectServiceOnline = false;
          });
      });
  }

  storeInDb(){

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

  getErrorMessageBezeichnung() {
    return this.email.hasError('reqired') ? 'Sie müssen einen Wert eingeben' :
      this.email.hasError('email') ? 'Keine gültige Bezeichnung' : '';
  }

  ngOnDestroy() {
    this.activatedRouteSubscription.unsubscribe();
  }

}
