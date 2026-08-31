import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "logs/**",
      "node_modules/**",
      "tsconfig.tsbuildinfo",
    ],
  },
  ...nextVitals,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-location-assign-relative-destination": "off",
      "jsx-a11y/alt-text": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
