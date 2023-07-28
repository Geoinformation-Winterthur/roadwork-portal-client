import { ErrorMessageDictionary } from "./error-message-dictionary";

export class ErrorMessageEvaluation {

  public static _evaluateErrorMessage(errorMessage: any) {
    if (errorMessage !== null && errorMessage.errorMessage !== null
            && errorMessage.errorMessage.trim() !== "") {
      let errorMessageString: string = errorMessage.errorMessage;
      if (errorMessageString.startsWith("SSP-")) {
        let messageCode: number = Number(errorMessageString.split('-')[1]);
        errorMessageString = ErrorMessageDictionary.messages[messageCode]
          + " (" + errorMessageString + ")";
      }
      errorMessage.errorMessage = errorMessageString;

    }
  }

}