// Types ---------------------------------------------------------------------->

export interface UIError {
  /** A unique identifier for the given error being thrown. (Recommendation is for the value to be in `plain_english_camel_case`) */
  messageId: string;

  /** A plain english reason for why the error occurred. (Logged in the backend and returned to the user as a backup of the error message) */
  reason: string;

  /** The HTTP status code the error generated. */
  status: number;

  /** A transaction ID provided for the given API call. (Depends on transactionId support in go backend) */
  transactionId: string;

  /** Additional details that will be rendered for the user. (Useful for attaching additional information that may be required for easier customer support.) */
  details: Record<string, unknown>;
}
