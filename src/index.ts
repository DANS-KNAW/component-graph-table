import path from "path";
import dotenv from "dotenv";
import dbIngestJson from "./database/dbIngestJson";
import esIngestIndex from "./elasticsearch/esIngestIndex";

dotenv.config({ path: path.join(__dirname, "../.env") });

(async () => {
  await dbIngestJson();
  await esIngestIndex();
  console.log("[Status]: Ingestion complete! 🎉");
})();
