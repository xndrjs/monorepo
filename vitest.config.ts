import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: [
            "apps/**/*.{test,spec}.ts",
            "packages/**/*.{test,spec}.ts",
            "plop/**/*.{test,spec}.ts",
          ],
        },
      },
      {
        test: {
          name: "react",
          environment: "jsdom",
          include: [
            "apps/**/*.{test,spec}.{tsx,jsx}",
            "packages/**/*.{test,spec}.{tsx,jsx}",
          ],
        },
      },
    ],
  },
});
