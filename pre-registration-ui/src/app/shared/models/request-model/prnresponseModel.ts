import { PRNResponseErrorDetailsModel } from "./prnresponse-error-detailsModel";
import { PRNResponseSuccessModel } from "./prnresponse-successModel";

export interface PRNResponseModel {
    id: string;
  version: string;
  responsetime: string;
  response: PRNResponseSuccessModel | null;  // Can be null if there are errors
  errors: string | PRNResponseErrorDetailsModel[];  // Can be a string or an array of error details
}
