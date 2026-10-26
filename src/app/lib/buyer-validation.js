export function buyerEmailError(email) {
  if (!email.trim()) return "Email address is required.";
  if (email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email address.";
  }
  return "";
}

export function buyerPasswordError(password) {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must contain at least 8 characters.";
  if (new TextEncoder().encode(password).length > 72) return "Password must not exceed 72 bytes.";
  return "";
}

export function buyerConfirmationError(password, confirmation) {
  if (!confirmation) return "Please confirm your password.";
  return password === confirmation ? "" : "Passwords do not match.";
}
