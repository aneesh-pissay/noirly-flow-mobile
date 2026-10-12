import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { config } from "../config";
import { useAuth } from "./AuthContext";
import { errorMessage } from "./accountApi";
import { NoirlyIdentity } from "./identity";

let googleConfigured = false;

function ensureGoogle() {
  if (googleConfigured || !config.googleWebClientId) return Boolean(config.googleWebClientId);
  GoogleSignin.configure({ webClientId: config.googleWebClientId, offlineAccess: false });
  googleConfigured = true;
  return true;
}

/** Google sign-in, shared by the sign-in and create-account screens. */
export function useGoogleSignIn() {
  const { setSession } = useAuth();
  const [busy, setBusy] = useState(false);
  const available = Boolean(config.googleWebClientId);

  const signIn = useCallback(async () => {
    if (!ensureGoogle()) {
      Alert.alert("Google sign-in unavailable", "Google sign-in is not set up for this build.");
      return;
    }
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken;
      if (!idToken) return; // Cancelled from the account picker.
      setSession(await NoirlyIdentity.signInWithGoogle({ idToken }));
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return;
      Alert.alert("Sign in failed", errorMessage(error, "Google sign-in failed"));
    } finally {
      setBusy(false);
    }
  }, [setSession]);

  return { available, busy, signIn };
}
