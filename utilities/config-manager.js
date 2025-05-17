import fs from 'fs';
import path from 'path';

import fileDataProcessor from './file-data-processor.js';
import databaseUtil from './database-util.js';

async function process(configurationsArr, dbInteractor) {
  configurationsArr.forEach(async function (config) {
    if (!validateConfig(config)) {
      return;
    }

    await processConfiguration(config, dbInteractor);
  });
}

async function processConfiguration(config, dbInteractor) {
  for (let year of config.years) {
    for (let month of config.months) {
      const monthlyDataPath = path.join(config.basePath, `${year}_${month}`);

      // Skip if folder doesn't exist
      if (!fs.existsSync(monthlyDataPath)) {
        console.error(`Monthly data does not exist: ${monthlyDataPath}`);
        continue;
      }

      const fileProcessingData = getDataForProcessingFiles(config, monthlyDataPath);

      const mainFolderFilesDates = getMainFolderFilesDates(fileProcessingData);
      if (!mainFolderFilesDates) {
        console.error(
          `no main folder found for the config ${config.type} for the year ${year} and month ${month}`
        );
        continue;
      }

      const isValidationSuccess = validateAndRemoveUnnecessaryFiles(
        fileProcessingData,
        mainFolderFilesDates
      );
      if (!isValidationSuccess) {
        console.error(
          `validating and removing unnecessary file for the ${config.type} in year ${year} and month ${month} failed!`
        );
        continue;
      }

      const processedMonthlyData = await fileDataProcessor.process(fileProcessingData);
      const flattenedData = databaseUtil.flattenData(processedMonthlyData);

      // Insert the monthly data into DB.
      const dbOperationStats = await dbInteractor.insertData(config.tableName, flattenedData);

      console.log(
        `Insertion completed for month ${month} and year ${year} in ${dbOperationStats.durationMs}ms: ${dbOperationStats.successfulRecords} successful, ${dbOperationStats.failedRecords} failed`
      );

      // writeToFile(flattenedData);
    }
  }
}

/* 
  This is a test function, please ignore.
*/
function writeToFile(obj) {
  fs.writeFile(
    'F:\\stocks-data\\file-outputs\\output.json',
    JSON.stringify(obj, null, 2),
    'utf8',
    (err) => {
      if (err) {
        console.error('Error writing file:', err);
      } else {
        console.log('Object written to output.json');
      }
    }
  );
}

function validateAndRemoveUnnecessaryFiles(fileProcessingData, mainFolderFilesDates) {
  for (let data of fileProcessingData) {
    if (data.isMain) {
      continue;
    }

    let finalFileNames = [];
    let mainFileindex = 0;

    for (let runningIndex = 0; runningIndex < data.fileNames.length; runningIndex++) {
      let fileDate = extractDateFromFileName(
        data.fileNames[runningIndex],
        data.dateIndexInFileName,
        data.dateFormatInFileName,
        data.fileNameSeparator
      );

      if (fileDate !== mainFolderFilesDates[mainFileindex]) {
        // skip this file name as it doesn't exist in main folder.
        console.log(
          `file on the date ${fileDate} from the folder path ${data.folderPath} does not exist in the main folder - so skipping this`
        );
        continue;
      }

      finalFileNames.push(data.fileNames[runningIndex]);
      mainFileindex++;
    }

    data.fileNames = finalFileNames;

    if (data.fileNames.length !== mainFolderFilesDates.length) {
      console.error(
        `files in the folder path ${data.folderPath} are not the same as that of the main folder!`
      );
      return false;
    }
  }

  return true;
}

function getMainFolderFilesDates(fileProcessingData) {
  for (let data of fileProcessingData) {
    if (data.isMain) {
      return data.fileNames.map((fileName) =>
        extractDateFromFileName(
          fileName,
          data.dateIndexInFileName,
          data.dateFormatInFileName,
          data.fileNameSeparator
        )
      );
    }

    return null;
  }
}

function extractDateFromFileName(fileName, dateIndexInFileName, dateFormatInFileName, separator) {
  let fileNameSplit = fileName.split(separator);
  let dateInFileName = fileNameSplit[dateIndexInFileName];

  let year, month, day;

  // Support common date formats
  switch (dateFormatInFileName) {
    case 'YYYYMMDD':
      year = dateInFileName.slice(0, 4);
      month = dateInFileName.slice(4, 6);
      day = dateInFileName.slice(6, 8);
      break;
    case 'DDMMYYYY':
      day = dateInFileName.slice(0, 2);
      month = dateInFileName.slice(2, 4);
      year = dateInFileName.slice(4, 8);
      break;
    case 'MMDDYYYY':
      month = dateInFileName.slice(0, 2);
      day = dateInFileName.slice(2, 4);
      year = dateInFileName.slice(4, 8);
      break;
    // Add more formats as needed
    default:
      return null; // Unknown format
  }

  // Pad month and day if necessary
  if (year && month && day) {
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

function getDataForProcessingFiles(config, monthlyDataPath) {
  let fileProcessingData = [];

  for (let folderData of config.folders) {
    const folderPath = path.join(monthlyDataPath, folderData.folderName);

    // Skip if folder doesn't exist
    if (!fs.existsSync(folderPath)) {
      console.log(`Folder does not exist: ${folderPath}`);
      continue;
    }

    // Get all files in the folder
    let fileNames = fs.readdirSync(folderPath);
    // sort the file names so that they're in the same order across multiple folders.
    fileNames.sort();

    // build the data object required for processing the files and extracting the data from each of the files.
    fileProcessingData.push({
      ...folderData,
      folderPath,
      fileNames,
    });
  }

  return fileProcessingData;
}

function validateConfig(config) {
  // Validate the config structure

  if (!config.active) {
    console.log(`${config.type} : configuration inactive`);
    return false;
  }

  if (!config.basePath) {
    console.log(`${config.type} : configuration missing base url`);
    return false;
  }

  if (!config.years || !config.years.length) {
    console.log(`${config.type} : configuration missing years for which data is to be processed`);
    return false;
  }

  if (!config.months || !config.months.length) {
    console.log(`${config.type} : configuration missing months for which data is to be processed`);
    return false;
  }

  if (!config.folders || !config.folders.length) {
    console.log(`${config.type} : configuration missing folders for which data is to be processed`);
    return false;
  }

  if (!config.tableName) {
    console.log(
      `${config.type} : configuration missing table into which the data is to be operated on`
    );
    return false;
  }

  console.log(`${config.type} : valid configuration`);
  return true;
}

export default { process };
