export type AuthMode = "login" | "register";

export type AuthFormValues = {
  email: string;
  username: string;
  password: string;
  confirm: string;
};

export type AuthErrors = {
  email?: string;
  username?: string;
  password?: string;
  confirm?: string;
};

/**
 * Client-side rules for the mock sign-in / register form.
 */
export function validateAuthForm(
  mode: AuthMode,
  values: AuthFormValues,
): AuthErrors {
  const errors: AuthErrors = {};
  const email = values.email.trim();
  const username = values.username.trim();

  if (!email) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (mode === "register") {
    if (!username) {
      errors.username = "Username is required.";
    } else if (username.length < 3) {
      errors.username = "Username must be at least 3 characters.";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username = "Use letters, numbers, or underscore only.";
    }
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (mode === "register") {
    if (!values.confirm) {
      errors.confirm = "Confirm your password.";
    } else if (values.confirm !== values.password) {
      errors.confirm = "Passwords do not match.";
    }
  }

  return errors;
}

export function hasAuthErrors(errors: AuthErrors) {
  return Object.keys(errors).length > 0;
}
