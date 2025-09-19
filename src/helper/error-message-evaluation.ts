import { ErrorMessageDictionary } from "./error-message-dictionary";

/**
 * Normalizes/expands backend error messages for user-facing display.
 */
export class ErrorMessageEvaluation {

  /**
   * Evaluate and transform an incoming error message object in-place.
   *
   * @param errorMessage Any object that may contain an `errorMessage` string field.
   *                     Expected shape: `{ errorMessage: string }`
   *                     Mutated on success to replace code tokens with
   *                     dictionary entries while preserving the original code.
   */
  public static _evaluateErrorMessage(errorMessage: any) {
    // Proceed only if the object and its `errorMessage` property exist and are non-empty.
    if (errorMessage !== null && errorMessage.errorMessage !== null
            && errorMessage.errorMessage.trim() !== "") {
      let errorMessageString: string = errorMessage.errorMessage;

      // Detect coded messages of the form "SSP-<number>" and map to dictionary text.
      if (errorMessageString.startsWith("SSP-")) {
        // Extract the numeric portion after the hyphen and use it as an index.
        let messageCode: number = Number(errorMessageString.split('-')[1]);

        // Replace with the dictionary entry and append the original code in parentheses.
        errorMessageString = ErrorMessageDictionary.messages[messageCode]
          + " (" + errorMessageString + ")";
      }

      // Write the normalized text back to the original object.
      errorMessage.errorMessage = errorMessageString;

    }
  }

}
