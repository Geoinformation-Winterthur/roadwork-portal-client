/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) City Administration of Winterthur. All rights reserved.
 */
 import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

 export class ImageHelper {
 
     public static openImage(base64String: string) {
         let defectImage: HTMLImageElement = new Image();
         defectImage.src = base64String;
         let newWindow = window.open("");
         if(newWindow !== null){
            newWindow.document.write(defectImage.outerHTML);
         }
     }
 
     public static sanitizeUrl(base64String: string, domSanitizer: DomSanitizer): SafeUrl {
         return domSanitizer.bypassSecurityTrustUrl(base64String);
     }
 
     public static downsizeImage(base64String: string, maxWidth: number,
         maxHeight: number): Promise<string> {
         let theImage: HTMLImageElement = new Image();
         theImage.src = base64String;
         return new Promise<string>(fullfill => {
             theImage.onload = () => {
                 let result: string = base64String;
                 // what rules the transformation? width or height?:
                 let widthRules = true; // else height directs
                 if (theImage.width <= maxWidth &&
                     theImage.height <= maxHeight) {
                     // image size is already okay, so do nothing:
                     fullfill(result);
                 }
                 // if we would resize the image along its width,
                 // would the height then also be okay?:
                 let newHeight: number = (maxWidth / theImage.width) * theImage.height;
                 if (newHeight > maxHeight) {
                     widthRules = false;
                     // this means: height rules, not width
                 }
 
                 let canvas: HTMLCanvasElement = document.createElement('canvas');
                 let context2D: CanvasRenderingContext2D | null = canvas.getContext("2d");
                 if (widthRules) {
                     // width rules: width is preserved, height is adjusted:
                     canvas.width = maxWidth;
                     canvas.height = newHeight;
                 } else {
                     // height rules: height is preserved, width is adjusted:
                     let newWidth: number = (maxHeight / theImage.height) * theImage.width;
                     canvas.width = newWidth;
                     canvas.height = maxHeight;
                 }

                 if(context2D !== null)
                 {
                    context2D.drawImage(theImage, 0, 0,
                        canvas.width, canvas.height);   
                 }
                 result = canvas.toDataURL();
                 fullfill(result);
             };
         });
     }
 
     public static cropImage(base64String: string, ratioWidth: number,
         ratioHeight: number): Promise<string> {
         let theImage: HTMLImageElement = new Image();
         theImage.src = base64String;
         return new Promise<string>(fullfill => {
             theImage.onload = () => {
                 let result: string = base64String;
                 let newHeight: number = (theImage.width / ratioWidth) * ratioHeight;
                 let canvas: HTMLCanvasElement = document.createElement('canvas');
                 let context2D: CanvasRenderingContext2D | null = canvas.getContext("2d");
                 if (newHeight > theImage.height) {
                     let newWidth: number = (theImage.height / ratioHeight) * ratioWidth;
                     canvas.width = newWidth;
                     canvas.height = theImage.height;
                     let centerWidthDiff = (theImage.width - newWidth) / 2;
                     if(context2D !== null) {
                        context2D.drawImage(theImage, -centerWidthDiff, 0);
                     }
                 } else {
                     canvas.width = theImage.width;
                     canvas.height = newHeight;
                     let centerHeightDiff = (theImage.height - newHeight) / 2;
                     if(context2D !== null) {
                        context2D.drawImage(theImage, 0, -centerHeightDiff);
                     }
                 }
                 result = canvas.toDataURL();
                 fullfill(result);
             };
         });
     }
 
 }