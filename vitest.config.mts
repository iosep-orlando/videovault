import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: { JWT_SECRET: "secreto-solo-para-tests" },
    coverage: {
      provider: "v8",
      // La lógica que no necesita MongoDB ni RustFS en marcha.
      include: ["lib/validation.ts", "lib/search.ts", "lib/jwt.ts", "lib/password.ts", "lib/s3.ts", "lib/format.ts", "lib/navigation.ts", "lib/tags.ts", "lib/duration.ts"],
      reporter: ["text", "cobertura", "html"],
    },
  },
});
