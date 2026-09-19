import { ApiError } from "@/services/api";

/** Turns API failures into sentences a person can act on. */
export function humanError(error: unknown, fallback = "Something went wrong on our side."): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Some details don't look right. Check the highlighted fields and try again.";
    if (error.status === 401) return "Your session ended. Sign in again to continue.";
    if (error.status === 403) return "This belongs to someone else, so you can't change it.";
    if (error.status === 404) return "We couldn't find that. It may have been removed.";
    if (error.status === 409) return error.message;
    return fallback;
  }
  if (error instanceof TypeError) return "We couldn't reach radius. Check your connection and try again.";
  return fallback;
}

/** Amazon Cognito sign-in/sign-up errors, in plain words. */
export function authError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  switch (name) {
    case "UsernameExistsException":
      return "There's already an account with this email. Log in instead.";
    case "InvalidPasswordException":
      return "That password doesn't meet the rules below.";
    case "NotAuthorizedException":
      return "That email and password don't match. Try again or reset your password.";
    case "UserNotFoundException":
      return "We couldn't find an account with that email.";
    case "CodeMismatchException":
      return "That code isn't right. Check the email and try again.";
    case "ExpiredCodeException":
      return "That code has expired. Send a new one.";
    case "LimitExceededException":
    case "TooManyRequestsException":
    case "TooManyFailedAttemptsException":
      return "Too many attempts. Wait a few minutes and try again.";
    case "UserAlreadyAuthenticatedException":
      return "You're already signed in.";
    case "InvalidParameterException":
      return "Some details don't look right. Check them and try again.";
    case "EmptySignInUsername":
    case "EmptySignUpUsername":
      return "Enter your email address.";
    case "EmptySignInPassword":
    case "EmptySignUpPassword":
      return "Enter your password.";
    default:
      return error instanceof TypeError ? "We couldn't reach the sign-in service. Check your connection." : "Something went wrong signing you in. Try again.";
  }
}
