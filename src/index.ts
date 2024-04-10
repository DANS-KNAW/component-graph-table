import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import esIngestIndex from "./elasticsearch/esIngestIndex";
import { customLog, throwErrorAndLog } from "./lib/customLog";
import DelimitedToJSON from "./lib/delimited-to-json";
import { ConvertedFiles, RawJSONData } from "./types/RawJsonData";
import DatabaseProvisioner from "./lib/DatabaseProvisioner";

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

  const fileToJson = async (): Promise<ConvertedFiles> => {
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

    return converter.convertFiles(files);
  };

  // Ingest JSON data into database.
  const dbIngest = async (files: ConvertedFiles): Promise<void> => {
    const db = new DatabaseProvisioner({
      host: process.env.DB_HOST ?? "localhost",
      port: parseInt(process.env.DB_PORT ?? "5432"),
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASS ?? "",
      database: process.env.DB_NAME ?? "postgres",
    });

    await db.connect();
    await db.createTablesAndInsert(files);
    await db.disconnect();
  };

  // Create VIEW for JSON data.
  const dbCreateView = async (): Promise<void> => {};

  // Ingest rows into Elasticsearch.
  const esIngest = async (): Promise<void> => {};

  try {
    customLog("[Status]: Initializing ingestion process...");
    customLog("[Status]: Convert files to JSON...");

    const files = await fileToJson();

    customLog("[Status]: Ingesting JSON data into database...");

    await dbIngest(files);

    const end = Date.now();
    const seconds = ((end - start) / 1000).toFixed(2);

    customLog(`[Status]: Ingestion complete! Total time ${seconds}s 🎉`, {
      color: "green",
    });
  } catch (error) {
    const LogLevel = {
      NONE: "NONE",
      DEBUG: "DEBUG",
      INFO: "INFO",
    } as const;

    type LogLevelType = keyof typeof LogLevel | string;
    const loggingLevel: LogLevelType = process.env.LOGGING ?? "NONE";

    if (loggingLevel === LogLevel.DEBUG) {
      console.error(error);
    }
    customLog("[Error]: Ingestion failed. Check logs for more information.", {
      color: "red",
    });
  }
})();
