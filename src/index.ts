import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import dbIngestJson from "./database/dbIngestJson";
import esIngestIndex from "./elasticsearch/esIngestIndex";
import { env } from "process";
import { throwErrorAndLog } from "./lib/customLog";
import DelimitedToJSON from "./lib/delimited-to-json";

dotenv.config({ path: path.join(__dirname, "../.env") });

(async () => {
  const start = Date.now();

  /**
   * Convert CSV types to JSON.
   * 2. Convert CSV to JSON.
   * 2.1. Save JSON Files.
   */
  const datasetLocation = (): string => {
    /**
     * Not quite sure how to handle this yet.
     * Currently local file is being used.
     *
     * The approach I'm thinking of is simply creating a handful of functions.
     * 1. Google Drive Endpoint.
     * 2. Bucket Endpoint.
     * 3. Zip file.
     */

    const LOCAL_SOURCE = path.resolve(process.cwd(), "data_sources");

    if (!fs.existsSync(LOCAL_SOURCE)) {
      throwErrorAndLog(
        `[Error]: "LOCAL SOURCE" Selected but "${LOCAL_SOURCE}" directory does not exist.`
      );
    }

    return LOCAL_SOURCE;
  };

  const fileToJson = async (): Promise<void> => {
    const ALLOWED_EXTENSIONS = [".csv", ".tsv", ".json"];

    const files = fs.readdirSync(datasetLocation());

    // Check if all file extensions are allowed.
    const isAllowed = files.every((file) => {
      const ext = path.extname(file);
      return ALLOWED_EXTENSIONS.includes(ext);
    });

    if (!isAllowed) {
      const stringExtensions = ALLOWED_EXTENSIONS.join(" ");
      throwErrorAndLog(
        `[Error]: File('s) found with unsupported extension(s). Supported extensions: ${stringExtensions}`
      );
    }

    const converter = new DelimitedToJSON(datasetLocation());

    const x = await converter.convertFiles(files);

    
  };

  // Ingest JSON data into database.
  const dbIngest = async (): Promise<void> => {};

  // Create VIEW for JSON data.
  const dbCreateView = async (): Promise<void> => {};

  // Ingest rows into Elasticsearch.
  const esIngest = async (): Promise<void> => {};

  try {
    console.log("[Status]: Starting ingestion process...");
    console.log("[Status]: Converting files to JSON...");
    await fileToJson();
  } catch (error) {
    if (process.env.DEBUG === "true") {
      console.error(error);
    }
  }

  const end = Date.now();
  const seconds = ((end - start) / 1000).toFixed(2);

  console.log(`[Status]: Ingestion complete! Total time ${seconds}s 🎉`);
})();
