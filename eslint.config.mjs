// eslint-config-next 16 ships a native flat config — no FlatCompat needed.
import coreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...coreWebVitals,
  {
    // react-hooks v6 (bundled with eslint-config-next 16) added these rules.
    // The codebase predates them — keep them visible as warnings, not blockers.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "android/**",
      "build/**",
      "next-env.d.ts",
      "out/**",
      "reportfolio-main/**",
      "fittoken/**",
      ".claude/**",
      "scripts/**",
    ],
  },
];

export default eslintConfig;
