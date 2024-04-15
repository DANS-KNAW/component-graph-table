import { throwErrorAndLog } from "./custom-log";
import * as es7 from "es7";
import DatabaseProvisioner from "./database-provisioner";

class EsManager {
  private client: es7.Client;
  private indexName: string;
  private dbManeger: DatabaseProvisioner;

  constructor(indexName: string, dbManeger: DatabaseProvisioner) {
    this.indexName = indexName;
    this.dbManeger = dbManeger;
    this.client = this.connect();
  }

  private connect(): es7.Client {
    try {
      return new es7.Client({
        node: process.env.ES_ENDPOINT,
      });
    } catch (error) {
      throwErrorAndLog(`[Error]: Could not setup connection to Elastic`, error);
    }
  }

  public disconnect(): void {
    try {
      this.client.close();
    } catch (error) {
      throwErrorAndLog(`[Error]: Could not disconnect from Elastic`, error);
    }
  }

  /**
   * Creates an index in ElasticSearch if it doesn't already exist.
   * @returns A Promise that resolves to void.
   */
  public async createIndex(): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({
        index: this.indexName,
      });

      if (!indexExists.body) {
        await this.client.indices.create({
          index: this.indexName,
        });
      }
    } catch (error) {
      throwErrorAndLog(`[Error]: Could not create index in Elastic`, error);
    }
  }

  /**
   * Indexes the view rows into Elasticsearch.
   *
   * @returns A Promise that resolves to void.
   */
  public async indexViewRows(): Promise<void> {
    const rowsPerPage = 20;
    let page = 0;

    try {
      while (true) {
        const results = await this.dbManeger.getViewRows(rowsPerPage, page);

        /**
         * The id is commented out because the uuid_rda is not present in all views.
         * If the id is not provided, Elasticsearch will generate a random id.
         * Not sure if this is the desired behavior.
         * @todo Best possible solution is to have an method that infers the id from the view.
         */
        for (const row of results.rows) {
          await this.client.index({
            index: this.indexName,
            body: row,
            // id: row.uuid_rda,
          });
        }

        if (results.rows.length < rowsPerPage) {
          break;
        } else {
          page++;
        }
      }
    } catch (error) {
      this.dbManeger.disconnect();
      throwErrorAndLog(`[Error]: Could not index row in Elastic`, error);
    }
  }
}

export default EsManager;
