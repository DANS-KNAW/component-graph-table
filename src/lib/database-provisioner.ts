import { Client, QueryResult } from "pg";
import { ConvertedFiles, RawJSONData } from "../types/rawJsonData";
import { customLog, throwErrorAndLog } from "./custom-log";
import { DbCredentials, ViewConfig, Projects } from "../types/databaseTypes";
import { rdaJoins } from "../views";

class DatabaseProvisioner {
  private dbCredentials: DbCredentials;
  private client: Client;
  private viewConfig: ViewConfig;

  constructor(dbCredentials: DbCredentials, project: Projects) {
    this.dbCredentials = dbCredentials;
    this.client = new Client(this.dbCredentials);
    this.viewConfig = this.getViewConfig(project);
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      throwErrorAndLog(`[Error]: Could not connect to database.`, error);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.end();
    } catch (error) {
      throwErrorAndLog(`[Error]: Could not disconnect from database.`, error);
    }
  }

  /**
   * Retrieves the view configuration based on the specified project.
   * @param project - The project name.
   * @returns The view configuration object.
   * @throws If the project is not found.
   */
  private getViewConfig(project: Projects): ViewConfig {
    switch (project) {
      case "RDA":
        return {
          targetTable: "resource",
          viewResource: "view_resource",
          joins: rdaJoins,
        };
      case "FC4E":
        return {
          targetTable: "fc4e",
          viewResource: "fc4e_view",
          joins: [],
        };
      default:
        throwErrorAndLog(`[Error]: Project not found: ${project}`);
    }
  }

  /**
   * Creates tables and inserts data into the database based on the provided files.
   *
   * @param files - An object containing the files to be processed.
   */
  public async createTablesAndInsert(files: ConvertedFiles): Promise<void> {
    await this.client.query(
      `DROP VIEW IF EXISTS ${this.viewConfig.viewResource};`
    );

    for (const [tableName, data] of Object.entries(files)) {
      await this.client.query(`DROP TABLE IF EXISTS ${tableName}`);

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

      if (
        data.length === 1 &&
        Object.values(data[0]).every((value) => value === null)
      ) {
        customLog(
          `[Warning]: Skipping table data: ${tableName} as it has one row with all null values.\nAssuming this is an empty table`,
          {
            color: "yellow",
          }
        );
        continue;
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
  private determineColumns(data: RawJSONData[]): string[] {
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
  private generateCreateTableQuery(
    tableName: string,
    columns: string[]
  ): string {
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
  ): string {
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
  private async insertData(
    tableName: string,
    data: RawJSONData[]
  ): Promise<void> {
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

  /**
   * Creates a query view based on the provided configuration.
   * The view is created by executing a series of SQL queries.
   * @returns A Promise that resolves when the view creation is complete.
   * @throws If an error occurs during the view creation process.
   */
  public async createQueryView(): Promise<void> {
    try {
      await this.client.query("BEGIN");
      await this.client.query(`
        CREATE VIEW ${this.viewConfig.viewResource} AS
        SELECT * FROM ${this.viewConfig.targetTable}
        ${this.viewConfig.joins.join("\n")};
      `);
      await this.client.query("COMMIT");
    } catch (error) {
      await this.client.query("ROLLBACK");
      await this.disconnect();
      throwErrorAndLog(
        `[Error]: Could not create view: ${this.viewConfig.viewResource}`,
        error
      );
    }
  }

  /**
   * Retrieves a specified number of rows from a database view.
   *
   * @param rows The number of rows to retrieve. Defaults to 20.
   * @param page The page number of the rows to retrieve. Defaults to 0.
   * @returns A promise that resolves to a QueryResult containing the retrieved rows.
   */
  public async getViewRows(
    rows: number = 20,
    page: number = 0
  ): Promise<QueryResult<any>> {
    const offset = rows * page;
    try {
      return await this.client.query(
        `SELECT * FROM ${this.viewConfig.viewResource} OFFSET ${offset} LIMIT ${rows};`
      );
    } catch (error) {
      await this.disconnect();
      throwErrorAndLog(`[Error]: Could not retrieve view rows.`, error);
    }
  }
}

export default DatabaseProvisioner;
