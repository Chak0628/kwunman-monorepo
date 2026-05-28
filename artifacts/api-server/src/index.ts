import app from "./app";
import { logger } from "./lib/logger";

if (!process.env["VERCEL"]) {
  const rawPort = process.env["PORT"] || "3000";
  const port = Number(rawPort);
  app.listen(port, (err: any) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

export default app;