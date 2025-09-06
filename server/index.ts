import { createApp } from "./app";
import { log } from "./vite";
import { createServer } from "http";

(async () => {
  const app = await createApp();

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const server = createServer(app);
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
