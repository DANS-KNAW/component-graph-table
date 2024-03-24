import { SOURCE_DIR, DELIMITER_TYPES, JSON_DIR } from "../constants";
import fs from "fs";
import path from "path";
import csv from "csvtojson";
import ProgressBar from "progress";
import excelSerialDateToDate from "./excelSerialDateToDate";

interface JsonFilesObjects {
  [key: string]: any;
}

/**
 * Converts CSV files to JSON format.
 *
 * @param dump_json - Flag indicating whether to output the JSON files.
 * @returns An object containing the converted JSON files.
 * @throws Error if the files are not of the same type.
 */
async function csvToJson(dump_json: boolean = false) {
  const files = fs.readdirSync(SOURCE_DIR);

  // Get all extensions of files in the directory
  const file_extensions = files.map((file) => path.extname(file));

  // Check if all files are in the delimiter types
  const is_same_file_type = file_extensions.every(
    (ext) => ext === ".csv" || ext === ".tsv" || ext === ".psv"
  );

  // If not, throw an error
  if (!is_same_file_type) {
    throw new Error('All files must be of either type ".csv/.tsv/.psv".');
  }

  const bar = new ProgressBar(
    "[Converting]: Turning SV type files to JSON [:current/:total] ",
    {
      total: files.length,
    }
  );

  let json_files_object: JsonFilesObjects = {};

  for (const file of files) {
    // Get the delimiter type of the file
    const delimiter = path
      .extname(file)
      .slice(1)
      .toUpperCase() as keyof typeof DELIMITER_TYPES;

    // Convert the CSV files to JSON based on the delimiter type.
    const raw_json_file = await csv({
      delimiter: DELIMITER_TYPES[delimiter],
    }).fromFile(path.join(SOURCE_DIR, file));

    // Clean the column names and convert them to lowercase.
    raw_json_file.forEach((row) => {
      for (const column in row) {
        let new_column = column.trim().replace(/[- ]/g, "_");
        new_column = new_column.replace(/[^a-zA-Z0-9_#]/g, "");
        new_column = new_column.toLowerCase();

        // Check if new_column is identical to column name
        // If not, delete the old column name
        if (new_column !== column) {
          row[new_column] = row[column];
          delete row[column];
        }
      }

      // Check if the "dc_date" column is a 5-digit number
      // Note: I feel like it should be changed in the dataset itself.
      // But for now I will keep it to make sure the data is consistent.
      if (
        "dc_date" in row &&
        typeof row["dc_date"] === "string" &&
        /^\d{5}$/.test(row["dc_date"])
      ) {
        const serialDateNumber = parseInt(row["dc_date"], 10);
        row["dc_date"] = excelSerialDateToDate(serialDateNumber);
      }
    });

    // Create the JSON file name based on the CSV file name.
    let file_name = file.trim().replace(/[- ]/g, "_");
    file_name = file_name.slice(0, file_name.lastIndexOf("."));
    file_name = file_name.toLowerCase();

    // Output the JSON file if the flag is set to true.
    if (dump_json) {
      // Create the JSON directory if it doesn't exist.
      if (!fs.existsSync(JSON_DIR)) {
        fs.mkdirSync(JSON_DIR);
      }

      // Output the JSON file if the flag is set to true.
      fs.writeFileSync(
        path.join(JSON_DIR, `${file_name}.json`),
        JSON.stringify(raw_json_file)
      );
    }

    bar.tick();

    // Add the JSON file to the object.
    json_files_object[file_name] = raw_json_file;
  }

  return json_files_object;
}

export default csvToJson;
