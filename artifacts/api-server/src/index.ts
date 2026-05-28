import app from "./app";
import { logger } from "./lib/logger";

// 如果不在 Vercel 环境，则启动服务器监听
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

// 导出 app 供 Vercel Serverless 使用
export default app;