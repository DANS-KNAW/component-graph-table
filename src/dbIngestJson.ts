import { Client } from "pg";
import { SCHEMA_NAME } from "./constants";
import createQueryView from "./query-view";
import csvToJson from "./lib/csvToJson";
import ProgressBar from "progress";


/**
 * Ingests JSON data into the database.
 * Creates the view `view_resource` and ingests the JSON data into the database.
 * 
 * @returns A Promise that resolves when the ingestion is complete.
 */
async function dbIngestJson(): Promise<void> {
  const client = new Client();

  await client.connect();

  const json_files = await csvToJson();

  // Drop the `view_resource` view if it exists.
  await client.query(`DROP VIEW IF EXISTS view_resource;`);

  const ingest_amount = Object.keys(json_files).length;
  const bar = new ProgressBar("[Ingest]: Ingesting Tables [:current/:total]", {
    total: ingest_amount,
  });

  for (const table in json_files) {
    // Check if table exists.
    // NOTICE: this query only works for postgresql 9.4 and above.
    const table_exists = await client.query(
      `SELECT to_regclass('${SCHEMA_NAME}.${table}')`
    );

    // If table exists, drop it.
    if (table_exists.rows[0].to_regclass !== null) {
      await client.query(`DROP TABLE ${SCHEMA_NAME}.${table}`);
    }

    // Get the columns of the table
    const columns = Object.keys(json_files[table][0]);

    // Create table with the columns
    // We currently don't have a way to determine the data type of the columns.
    // So we are just going to use TEXT for all columns.
    await client.query(
      `CREATE TABLE ${SCHEMA_NAME}.${table} (${columns
        .map((column) => `"${column}" TEXT`)
        .join(", ")});`
    );

    // Transform the JSON data into a string to be inserted into the database.
    const insert_values = json_files[table]
      .map((row: { [key: string]: string }) => {
        return `(${columns
          .map((column) => `'${row[column].replace(/'/g, "''")}'`)
          .join(", ")})`;
      })
      .join(", ");

    // Insert data into the table
    await client.query(
      `INSERT INTO ${SCHEMA_NAME}.${table} ("${columns.join(
        '", "'
      )}") VALUES ${insert_values};`
    );

    bar.tick();
  }

  // Create the `view_resource` view.
  await createQueryView(client);

  await client.end();
}

export default dbIngestJson;
