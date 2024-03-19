import path from "path";
import dotenv from "dotenv";
import dbIngestJson from "./database/dbIngestJson";
import esIngestIndex from "./elasticsearch/esIngestIndex";

dotenv.config({ path: path.join(__dirname, "../.env") });

(async () => {
  const start = Date.now();
  
  await dbIngestJson();
  await esIngestIndex();
  
  const end = Date.now();
  const seconds = ((end - start) / 1000).toFixed(2);

  console.log(`[Status]: Ingestion complete! Total time ${seconds}s 🎉`);
})();
