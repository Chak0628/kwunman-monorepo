import app from "./app";
import { logger } from "./lib/logger";

// 如果在 Vercel 环境中运行，直接导出 app 作为无服务器函数
if (process.env["VERCEL"]) {
  export default app;
} else {
  // 本地开发或传统服务器模式
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