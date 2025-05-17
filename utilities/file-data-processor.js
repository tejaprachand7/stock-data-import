import scheduler from './task-scheduler.js';
import conditionEvaluator from './condition-evaluator.js';

import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

async function process(data) {
  if (!validateData(data)) {
    return;
  }

  const tasks = buildTasks(data);

  // gets the singleton object of the scheduler.
  const TaskScheduler = scheduler.getTaskScheduler();
  // an array of arrays, where each child array is an array of objects where each object has the daily data of a single stock.
  const processedMonthlyData = await TaskScheduler.addBatchOfTasks(tasks, processDailyFiles);

  return processedMonthlyData;
}

async function processDailyFiles(info) {
  let processedDailyData = {};

  for (let index = 0; index < info.data.length; index++) {
    await processCSVFile(info.fileIndex, info.data[index], processedDailyData);
  }

  // return back an array of objects where each object has the daily data of a single stock.
  return Object.values(processedDailyData);
}

async function processCSVFile(fileIndex, data, result) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(data.folderPath, data.fileNames[fileIndex]);

    let rowsSkipped = 0;
    let totalRowsProcessed = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        totalRowsProcessed++;
        // Apply field-level filter if exists
        if (data.filter) {
          // For each filter in the array
          const passedFilter = conditionEvaluator.evaluate(row, data.filter);

          // Skip this row if it doesn't pass all filter
          if (!passedFilter) {
            rowsSkipped++;
            return;
          }
        }

        const uniqueDataVal = row[data.uniqueColumn];
        if (!result[uniqueDataVal]) {
          result[uniqueDataVal] = {};
        }

        let rowData = {};

        // Process the row data and populate the result object.
        data.columns.forEach((column) => {
          const [columnLabel, columnType] = data.columnLabelAndTypeMapping[column];
          let value = row[column].trim();
          const convertedValue = convertValueToCorrectType(columnType, value);
          rowData[columnLabel] = convertedValue;
        });

        result[uniqueDataVal] = { ...result[uniqueDataVal], ...rowData };
      })
      .on('end', () => {
        console.log(
          `Total ${totalRowsProcessed} were processed, out of which ${rowsSkipped} have been skipped for the file ${filePath}`
        );
        resolve();
      })
      .on('error', (err) => {
        console.error(`Error processing ${filePath}:`, err);
        resolve();
      });
  });
}

function convertValueToCorrectType(type, value) {
  let convertedValue = '';

  switch (type) {
    case 'INT':
      // TODO : Check if the value can exceed MAX_SAFE_INTEGER and convert to BigInt
      // also need to change how we pass it to PostgreSQL
      convertedValue = parseInt(value);
      break;
    case 'FLOAT':
      convertedValue = parseFloat(value);
      break;
    case 'DATE':
      convertedValue = new Date(value);
      break;
    case 'TEXT':
    default:
      convertedValue = value.toString();
  }

  return convertedValue;
}

function buildTasks(data) {
  let tasks = [];

  for (let ite = 0; ite < data[0].fileNames.length; ite++) {
    tasks.push({
      fileIndex: ite,
      data: data,
    });
  }

  return tasks;
}

function validateData(data) {
  const numFiles = data[0].fileNames.length;
  // each folder must have the same number of files.
  for (let index = 0; index < data.length; index++) {
    if (!data[index].columns || !data[index].columns.length) {
      console.log(
        `No columns to be processed are available in the config for the folder path ${data[index].folderPath}`
      );
      return false;
    }

    if (data[index].fileNames.length !== numFiles) {
      console.log(
        `Number of files to be processed are inconsistent in the config for the folder path ${data[index].folderPath}`
      );
      return false;
    }
  }
  return true;
}

export default {
  process,
};
