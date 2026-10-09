/** App config — production Noirly hosts (no WebView). */
export const config = {
  identityIssuer: "https://noirly.identity.aneesh-pissay.in",
  identityClientId: "noirly-flow-mobile",
  flowApiUrl: "https://noirly.flow.aneesh-pissay.in",
  realtimeWsUrl: "wss://noirly.realtime.aneesh-pissay.in/ws",
  /** Identity’s public GOOGLE_CLIENT_ID (web) — used as Google Sign-In webClientId. */
  googleWebClientId:
    "919812667870-l48gsfejidtd3bo4qlbjmrf940ojor29.apps.googleusercontent.com",
} as const;
