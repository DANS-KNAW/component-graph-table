import { Client } from "pg";
import { ConvertedFiles, RawJSONData } from "../types/RawJsonData";
import { customLog, throwErrorAndLog } from "./customLog";

interface DbCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

class DatabaseProvisioner {
  private dbCredentials: DbCredentials;
  private client: Client;

  constructor(dbCredentials: DbCredentials) {
    this.dbCredentials = dbCredentials;
    this.client = new Client(this.dbCredentials);
  }

  public async connect() {
    try {
      await this.client.connect();
    } catch (error) {
      throwErrorAndLog(`[Error]: Could not connect to database.`, error);
    }
  }

  public async disconnect() {
    try {
      await this.client.end();
    } catch (error) {
      throwErrorAndLog(`[Error]: Could not disconnect from database.`, error);
    }
  }

  /**
   * Creates tables and inserts data into the database based on the provided files.
   * 
   * @param files - An object containing the files to be processed.
   */
  public async createTablesAndInsert(files: ConvertedFiles) {
    await this.client.query(`DROP VIEW IF EXISTS view_resource;`);

    for (const [tableName, data] of Object.entries(files)) {
      const tableExists = await this.client.query(
        `SELECT to_regclass('${tableName}')`
      );

      if (tableExists.rows[0].to_regclass !== null) {
        await this.client.query(`DROP TABLE ${tableName}`);
      }

      const columns = this.determineColumns(data);
      const createTableQuery = this.generateCreateTableQuery(
        tableName,
        columns
      );

      try {
        await this.client.query("BEGIN");
        await this.client.query(createTableQuery);
        await this.client.query("COMMIT");
      } catch (error) {
        await this.client.query("ROLLBACK");
        await this.disconnect();
        throwErrorAndLog(
          `[Error]: ROLLBACK! Could not create table: ${tableName}`,
          error
        );
      }

      await this.insertData(tableName, data);
    }
  }

  /**
   * Determines the unique columns from the given array of raw JSON data.
   *
   * @param data - The array of raw JSON data.
   * @returns An array of unique column names.
   */
  private determineColumns(data: RawJSONData[]) {
    const columns: string[] = [];

    data.forEach((row) => {
      for (const column in row) {
        // This needs a recheck/refactor as it might remove invalid duplicate columns that should be included.
        // Possible solution throw warning or error if a duplicate column is found.
        // The current issue is that after the first row there is no way to know if a column is missing.
        // Because once a column is found it will be seen as a duplicate for all sequential rows.
        if (!columns.includes(column)) {
          columns.push(column);
        }
      }
    });

    return columns;
  }

  /**
   * Generates a SQL query to create a table with the specified name and columns.
   *
   * @param tableName - The name of the table.
   * @param columns - An array of column names.
   * @returns The SQL query to create the table.
   */
  private generateCreateTableQuery(tableName: string, columns: string[]) {
    const columnDefinitions = columns
      .map((column) => `"${column}" TEXT`)
      .join(",\n");

    return `CREATE TABLE IF NOT EXISTS ${tableName} (\n${columnDefinitions}\n);`;
  }

  /**
   * Generates an SQL insert query for the specified table.
   *
   * @param tableName - The name of the table to insert data into.
   * @param columns - An array of column names.
   * @param values - A 2D array of values to insert.
   * @returns The generated SQL insert query.
   */
  private generateInsertQuery(
    tableName: string,
    columns: string[],
    values: string[][]
  ) {
    const columnNames = columns.map((column) => `"${column}"`).join(", ");
    const valueSets = values
      .map(
        (row) =>
          `(${row.map((value) => `'${value.replace(/'/g, "''")}'`).join(", ")})`
      )

      .join(",\n");

    return `INSERT INTO ${tableName} (${columnNames}) VALUES\n${valueSets};`;
  }

  /**
   * Inserts data into the specified table.
   *
   * @param tableName - The name of the table to insert data into.
   * @param data - An array of objects representing the data to be inserted.
   */
  private async insertData(tableName: string, data: RawJSONData[]) {
    const columns = Object.keys(data[0]);
    const values = data.map((row) =>
      columns.map((column) => row[column] ?? "NULL")
    );

    const insertQuery = this.generateInsertQuery(tableName, columns, values);

    try {
      await this.client.query("BEGIN");
      await this.client.query(insertQuery);
      await this.client.query("COMMIT");
    } catch (error) {
      await this.client.query("ROLLBACK");
      await this.disconnect();
      throwErrorAndLog(
        `[Error]: ROLLBACK! Could not insert data into table: ${tableName}`,
        error
      );
    }
  }
}

export default DatabaseProvisioner;
