import { Client } from "pg";
import * as es7 from "es7";
import ProgressBar from "progress";

/**
 * Ingests data from a PostgreSQL database into an Elasticsearch index.
 * 
 * @param mappings Optional mappings for the Elasticsearch index.
 */
const esIngestIndex = async () => {
  const INDEX_NAME = "dans-rda2";
  const ROWS_PER_PAGE = 20;
  let page = 1;

  const client = new Client();

  let esClient = new es7.Client({
    node: "http://localhost:9200",
  });

  if (process.env.NODE_ENV === "demo") {
    console.log("URL", `http://${process.env.DANS_DEMO_ES_URL}:9200`);
    esClient = new es7.Client({
      node: `http://${process.env.DANS_DEMO_ES_URL}:9200`,
    });
  }
  
  console.log("[Status]: Checking if index exists...")

  // Check if the index exists and create it if it doesn't
  const indexExists = await esClient.indices.exists({ index: INDEX_NAME });
  if (!indexExists.body) {
    try {
      await esClient.indices.create({
        index: INDEX_NAME
      });
      console.log(`[Status]: Index "${INDEX_NAME}" initialised!`);
    } catch (err) {
      console.log("[ERROR] initIndex", err);
    }
  } else {
    console.log(`[Status]: Index already exists moving on...`);
  }

  await client.connect();

  // Check the total number of rows in the view to calculate the total number of pages.
  const totalRowsResult = await client.query(
    `SELECT COUNT(*) FROM view_resource;`
  );
  const totalRows = parseInt(totalRowsResult.rows[0].count, 10);
  const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE);

  const bar = new ProgressBar(`[Ingest]: Indexing rows [:current/:total] :bar`, {
    total: totalPages,
  });

  while (true) {
    // Calculate offset at the start of each iteration to ensure it's always updated
    const offset = ROWS_PER_PAGE * (page - 1);

    bar.tick();

    const results = await client.query(
      `SELECT * FROM view_resource OFFSET ${offset} LIMIT ${ROWS_PER_PAGE};`
    );

    // Insert the rows into the index
    for (const row of results.rows) {
      await esClient.index({
        index: INDEX_NAME,
        body: row,
        id: row.uuid_rda,
      });
    }

    // Check if this is the last page
    if (results.rows.length < ROWS_PER_PAGE) {
      bar.complete = true;
      break; // Exit loop if fewer rows than ROWS_PER_PAGE are returned, indicating the last page
    } else {
      page++; // Otherwise, prepare to fetch the next page
    }
  }

  await client.end();
};

export default esIngestIndex;