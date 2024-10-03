import { PRNResponseErrorDetails } from "./prnresponse-error-details";
import { PRNResponseSuccess } from "./prnresponse-success";

export interface PRNResponse {
    id: string;
  version: string;
  responsetime: string;
  response: PRNResponseSuccess | null;  // Can be null if there are errors
  errors: string | PRNResponseErrorDetails[];  // Can be a string or an array of error details
}
