import fs from "fs";
import path from "path";
import csv from "csvtojson";
import { DELIMITER_TYPES } from "../constants";
import { customLog, throwErrorAndLog } from "./custom-log";
import { ConvertedFiles, RawJSONData } from "../types/rawJsonData";
import { Transform, TransformCallback } from "stream";
import { formatISO, isValid, parse } from "date-fns";
import capitalizeFirstChar from "./capitalize-first-char";
import { iso6393 } from "../../data/lang";

class DelimitedToJSON {
  private source: string;

  constructor(source: string) {
    this.source = source; // Note: This is temporary. Should be replaced with stream for dynamic data source locations.
  }

  /**
   * Converts a delimited file to an array of JSON objects.
   *
   * @param file - The path of the delimited file to convert.
   * @returns A promise that resolves to an array of JSON objects representing the data in the file.
   */
  public async convertFile(file: string): Promise<RawJSONData[]> {
    const delimiter = this.determineDelimiter(file);

    const filePath = path.join(this.source, file);

    const readStream = fs
      .createReadStream(filePath)
      .pipe(await this.preProcessFile());

    const rawJson: RawJSONData[] = await csv({
      delimiter,
      nullObject: true,
    }).fromStream(readStream);

    let jsonData = this.sanitizeHeaders(rawJson);

    // Currently hardcoded column `dc_date` to be normalized.
    // This should be replaced after a method for identifying column types is implemented.
    jsonData.forEach((row) => {
      if (file === "Resource.tsv") {
        if ("dc_date" in row) {
          row["dc_date"] = this.normalizeDates(row["dc_date"]);
        }

        if ("dc_type" in row) {
          const rawType: string | null = row["dc_type"];

          if (rawType) {
            const type = rawType.split("/").pop();

            if (type) {
              const dcType = capitalizeFirstChar(
                type
                  .split(/(?=[A-Z])/)
                  .join(" ")
                  .toLowerCase()
              );

              delete row["dc_type"];
              row["dc_type"] = dcType;
            }
          }
        }

        if ("source" in row) {
          row["source"] = "RDA publication";
        }
      }

      if ("dc_language" in row) {
        const languageCode: string | null = row["dc_language"];

        if (languageCode) {
          // Check if the language code is inside the languageCodes alpha3 property.
          let language = iso6393.find(
            (lang) => lang.iso6393 === languageCode.trim()
          );

          // If the language is not found, log a warning.
          if (!language) {
            customLog(`[Warning]: Language code not found: ${languageCode}`, {
              color: "yellow",
            });
          }

          // If the language is found, replace the language code with the English name.
          if (language) {
            delete row["dc_language"];
            row["dc_language"] = language.name;
          }
        }
      }

      if (file === "Relation.tsv") {
        if ("relation_type" in row) {
          const rawRelationType: string = row["relation_type"];

          const relationType = capitalizeFirstChar(
            rawRelationType
              .split(/(?=[A-Z])/)
              .join(" ")
              .toLowerCase()
          );

          delete row["relation_type"];
          row["relation_type"] = relationType;
        }
      }
    });

    if (jsonData.length === 0) {
      const file = fs.readFileSync(filePath, { encoding: "utf-8" });
      const headers = file.split("\n")[0].split(delimiter);
      const emptyData: { [key: string]: null } = {};
      headers.forEach((header) => {
        emptyData[header] = null;
      });
      jsonData = this.sanitizeHeaders([emptyData]);
    }

    return jsonData;
  }

  /**
   * Converts an array of file paths to JSON format.
   * @param files - An array of file paths to be converted.
   * @returns A promise that resolves to an object containing the converted files.
   */
  public async convertFiles(files: string[]): Promise<ConvertedFiles> {
    const convertedFiles: ConvertedFiles = {};
    for (const file of files) {
      const fileName = path
        .parse(file)
        .name.toLowerCase()
        .replace(/[- ]/g, "_");

      const convertedFile = await this.convertFile(file);

      if (fileName in convertedFiles) {
        throwErrorAndLog(`[Error]: Duplicate file name found: ${fileName}`);
      }

      convertedFiles[fileName] = convertedFile;
    }
    return convertedFiles;
  }

  private async preProcessFile() {
    try {
      return new Transform({
        transform(chunk: Buffer, encoding: never, callback: TransformCallback) {
          let transformedChunk = chunk.toString().replace(/"/g, '\\"');
          this.push(transformedChunk);
          callback();
        },
      });
    } catch (error) {
      throwErrorAndLog(`[Error]: Could not preprocess file`, error);
    }
  }

  /**
   * Sanitizes the headers of the given data by removing leading/trailing spaces, replacing hyphens and spaces with underscores,
   * and converting the headers to lowercase. Also sets empty values to null.
   *
   * @param data - The raw JSON data.
   * @returns The sanitized JSON data.
   */
  private sanitizeHeaders(data: RawJSONData[]) {
    const cleanData = data.map((row) => {
      const cleanRow: RawJSONData = {};

      for (const column in row) {
        const cleanColumn = column
          .trim()
          .replace(/[()]/g, "")
          .replace(/[-. ]/g, "_")
          .toLowerCase();

        cleanRow[cleanColumn] = row[column];

        if (row[column] === "") {
          cleanRow[cleanColumn] = null;
        }

        if (cleanColumn !== column) {
          delete row[column];
        }
      }

      return cleanRow;
    });

    return cleanData;
  }

  /**
   * ES Dates prefered format: ISO 8601 (yyyy-MM-dd'T'HH:mm:ss.SSSZ)
   * Currenty only checks if the data is an Excel Serial Date.
   * This method depends on a method to identify the types of the data.
   */
  private normalizeDates(date: string | null): string | null {
    if (typeof date === "string") {
      date = date.trim();
      if (/^\d{5}$/.test(date)) {
        const serialDateNumber = parseInt(date, 10);
        date = this.excelSerialDateToDate(serialDateNumber);
      }

      const regex = /^\d{1,2}-\d{1,2}-\d{4}$/;

      // Check if dateStr matches the 'dd-MM-yyyy' format
      if (!regex.test(date)) {
        throwErrorAndLog(`[Error]: Invalid date format: ${date}`);
      }

      // Attempt to parse the date string. Note: We need to define custom parsing logic to handle single digit day/month.
      const parts = date.split("-").map((part) => parseInt(part, 10));
      const dateParsed = new Date(parts[2], parts[1] - 1, parts[0]); // JavaScript Date expects year, month (0-indexed), day

      // Validate if the parsed date is valid
      if (!isValid(dateParsed)) {
        throwErrorAndLog(`[Error]: Invalid date: ${date}`);
      }

      // Format the date to ISO 8601 format
      return formatISO(dateParsed);
    }
    return date;
  }

  /**
   * Converts an Excel serial date to a formatted date string (yyyy-mm-dd).
   *
   * @param serialDate - The Excel serial date to convert.
   * @returns The formatted date string in the format yyyy-mm-dd.
   */
  private excelSerialDateToDate(serialDate: number): string {
    // Excel's epoch starts on 1899-12-31
    const excelEpoch = new Date(Date.UTC(1899, 11, 31));

    // Add the serial date. Note: Excel incorrectly treats 1900 as a leap year
    let correctSerialDate = serialDate;

    if (serialDate > 59) {
      // Adjust for the fact that Excel's leap year bug means 1900 is treated as a leap year
      correctSerialDate -= 1;
    }

    const resultDate = new Date(
      excelEpoch.getTime() + correctSerialDate * 86400000
    ); // 86400000ms per day

    // Format the date as yyyy-mm-dd
    const yyyy = resultDate.getUTCFullYear();

    // getUTCMonth() returns month from 0-11; need to add 1 for correct month
    const mm = (resultDate.getUTCMonth() + 1).toString().padStart(2, "0");
    const dd = resultDate.getUTCDate().toString().padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Determines the delimiter used in the specified file.
   *
   * @param file - The file path.
   * @returns The estimated delimiter.
   * @throws An error if the delimiter cannot be determined.
   */
  private determineDelimiter(file: string): string {
    const rawData = fs
      .readFileSync(path.join(this.source, file), {
        encoding: "utf-8",
      })
      .split("\n")[0];

    const rowCount = rawData.split("\n").length;
    let maxFieldCount = 1;
    let estimatedDelimiter = null;

    for (const delimiter in DELIMITER_TYPES) {
      const delimiterValue =
        DELIMITER_TYPES[delimiter as keyof typeof DELIMITER_TYPES];

      const fieldCount = rawData.split(delimiterValue).length;

      if (fieldCount > maxFieldCount) {
        maxFieldCount = fieldCount;
        estimatedDelimiter = delimiterValue;
      }
    }

    if (estimatedDelimiter === null) {
      throw throwErrorAndLog(
        `[Error]: Unable to determine delimiter for file: ${file}`
      );
    }

    if (rowCount >= maxFieldCount) {
      customLog(`[Warning]: Possible delimiter error for file: ${file}`, {
        color: "yellow",
      });
    }

    return estimatedDelimiter;
  }
}

export default DelimitedToJSON;
