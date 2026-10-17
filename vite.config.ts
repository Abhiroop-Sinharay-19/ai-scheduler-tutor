// Shared project config supplies the application plugins, aliases, and build defaults.
import { defineConfig as defineLovableConfig } from "@lovable.dev/vite-tanstack-config";

const lovableConfig = defineLovableConfig({
  // Build standalone production deployments for Vercel. Lovable's own build
  // preset can still select its runtime independently.
  nitro: { preset: "vercel" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

export default async (env: Parameters<typeof lovableConfig>[0]) => {
  const config = await lovableConfig(env);

  return {
    ...config,
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
