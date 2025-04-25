import { defineConfig } from "cypress";

export default defineConfig({
  video: false,
  watchForFileChanges: false,

  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
