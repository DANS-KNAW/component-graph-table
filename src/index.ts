import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { customLog, throwErrorAndLog } from "./lib/custom-log";
import DelimitedToJSON from "./lib/delimited-to-json";
import { ConvertedFiles } from "./types/rawJsonData";
import DatabaseProvisioner from "./lib/database-provisioner";
import { Projects } from "./types/databaseTypes";
import EsManager from "./lib/es-manager";

dotenv.config({ path: path.join(__dirname, "../.env") });

const purge = process.argv.includes("--purge") ?? false;

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

  const filesToJson = async (): Promise<ConvertedFiles> => {
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

  try {
    customLog("[Status]: Initializing ingestion process...");
    customLog("[Status]: Convert files to JSON...");

    const files = await filesToJson();

    customLog("[Status]: Ingesting JSON data into database...");

    const db = new DatabaseProvisioner(
      {
        host: process.env.DB_HOST ?? "localhost",
        port: parseInt(process.env.DB_PORT ?? "5432"),
        user: process.env.DB_USER ?? "postgres",
        password: process.env.DB_PASS ?? "",
        database: process.env.DB_NAME ?? "postgres",
      },
      (process.env.PROJECT as Projects) ?? "NONE"
    );

    await db.connect();
    await db.createTablesAndInsert(files);
    await db.createQueryView();

    const index = process.env.ES_INDEX ?? undefined;

    if (!index) {
      throwErrorAndLog("[Error]: No Elasticsearch index specified.");
    }

    const es = new EsManager(index, db);

    customLog("[Status]: Ingesting data into Elasticsearch...");

    await es.createIndex(purge);
    await es.indexViewRows();

    await db.disconnect();
    es.disconnect();

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
