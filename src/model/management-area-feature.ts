import { Geometry } from "./geometry";

export class ManagementAreaFeature {
    type: string = "Feature";
    uuid: string = "";
    managername: string = "";
    geometry: Geometry = new Geometry();
}