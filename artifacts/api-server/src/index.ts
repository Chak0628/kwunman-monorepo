import app from "./app";

export default async function handler(req: any, res: any) {
  return new Promise((resolve, reject) => {
    app(req, res, (err: any) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}