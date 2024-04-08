import path from "path";

// Directory where the data sources are located.
export const SOURCE_DIR = path.resolve(process.cwd(), "data_sources");

// Output directory for the JSON files. (optional)
export const JSON_DIR = path.resolve(process.cwd(), "json");

// Accepeted delimiter for converting CSV to JSON.
export const DELIMITER_TYPES = {
  CSV: ",",
  CSV_SEMI: ";",
  TSV: "\t",
  PSV: "|",
};

// The schema name for the database.
export const SCHEMA_NAME = "public";
