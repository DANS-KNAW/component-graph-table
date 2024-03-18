import { SOURCE_DIR, DELIMITER_TYPES, JSON_DIR } from "../constants";
import fs from "fs";
import path from "path";
import csv from "csvtojson";
import ProgressBar from "progress";

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

  // Check if all files are of the same type
  const is_same_file_type = file_extensions.every(
    (val, i, arr) => val === arr[0]
  );

  // If not, throw an error
  if (!is_same_file_type) {
    throw new Error("All files must be of the same type.");
  }

  const bar = new ProgressBar("[Converting]: Turning SV type files to JSON [:current/:total] ", {
    total: files.length,
  });

  let json_files_object: JsonFilesObjects = {};

  for (const file of files) {
    // Convert the CSV files to JSON based on the delimiter type.
    const raw_json_file = await csv({
      delimiter: DELIMITER_TYPES.TSV,
    }).fromFile(path.join(SOURCE_DIR, file));

    // Clean the column names and convert them to lowercase.
    raw_json_file.forEach((row) => {
      for (const column in row) {
        let new_column = column.trim().replace(/[- ]/g, "_");
        new_column = new_column.replace(/[^a-zA-Z0-9_]/g, "");
        new_column = new_column.toLowerCase();

        row[new_column] = row[column];
        delete row[column];
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
