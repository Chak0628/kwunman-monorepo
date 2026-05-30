import app from "./app";

// 1. 必須優先讀取 process.env.PORT
const rawPort = process.env["PORT"] || "3000";
const port = Number(rawPort);

// 2. 必須綁定 "0.0.0.0"，唔可以寫 "localhost" 或者 127.0.0.1
app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});