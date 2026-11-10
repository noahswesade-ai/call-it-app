// Extends app.json. EXPO_BASE_URL lets the web build live under a sub-path
// (e.g. GitHub Pages at /call-it-app/) without affecting local development.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
