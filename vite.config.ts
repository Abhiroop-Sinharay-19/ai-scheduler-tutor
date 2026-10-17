// Shared project config supplies the application plugins, aliases, and build defaults.
import { defineConfig as defineLovableConfig } from "@lovable.dev/vite-tanstack-config";

const lovableConfig = defineLovableConfig({
  // GitHub Pages only serves static files; Supabase remains the backend.
  nitro: false,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts.
    server: { entry: "server" },
    spa: {
      enabled: true,
      prerender: { outputPath: "/index.html" },
    },
  },
});

const githubPages = process.env["GITHUB_PAGES"] === "true";
const pagesBase = githubPages ? "/ai-scheduler-tutor/" : "/";

export default async (env: Parameters<typeof lovableConfig>[0]) => {
  const config = await lovableConfig(env);

  return {
    ...config,
    base: pagesBase,
    build: {
      ...config.build,
      outDir: "dist",
    },
    environments: {
      ...config.environments,
      client: {
        ...config.environments?.["client"],
        build: { ...config.environments?.["client"]?.build, outDir: "dist" },
      },
      ssr: {
        ...config.environments?.["ssr"],
        build: { ...config.environments?.["ssr"]?.build, outDir: ".tanstack-build/server" },
      },
    },
    // The shared helper still injects this legacy plugin; use Vite 8's resolver instead.
    plugins: config.plugins?.filter(
      (plugin) =>
        !(
          plugin &&
          !Array.isArray(plugin) &&
          "name" in plugin &&
          plugin.name === "vite-tsconfig-paths"
        ),
    ),
    resolve: {
      ...config.resolve,
      tsconfigPaths: true,
    },
  };
};
