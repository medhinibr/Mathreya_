export function getFriendlyAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes('invalid credentials') || msg.includes('invalid_credentials')) {
      return 'Incorrect email or password. Please verify your credentials and try again.';
    }
    if (msg.includes('user with the same email already exists') || msg.includes('already exists')) {
      return 'An account with this email address already exists. Please sign in instead.';
    }
    if (msg.includes('password') && (msg.includes('short') || msg.includes('8 characters'))) {
      return 'Password must be at least 8 characters long.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    if (msg.includes('invalid secret') || msg.includes('invalid token') || msg.includes('token_expired') || msg.includes('secret_expired')) {
      return 'The OTP code is invalid or has expired. Please check the code or request a new one.';
    }
    if (msg.includes('token') || msg.includes('secret') || msg.includes('invalid param')) {
      return 'The verification link or OTP is invalid or has expired. Please request a new link.';
    }
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
      return 'Unable to connect to the server. Please check your network connection.';
    }
    return error.message;
  }
  return 'An unexpected authentication error occurred. Please try again.';
}
