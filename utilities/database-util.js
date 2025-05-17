import DBInteractor from '../database/database-interactor.js';

function initializeDataBaseInteractor() {
  const dbConfig = prepareDBConfig();
  const dbInteractor = new DBInteractor(dbConfig);
  return dbInteractor;
}

function prepareDBConfig() {
  const dbConfig = {
    host: process.env.DATA_SERVER_HOST,
    port: process.env.DATA_SERVER_PORT,
    database: process.env.DATABASE,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  };
  return dbConfig;
}

function flattenData(monthlyData) {
  let flattenedData = [];
  // Flatten the nested array structure for easier processing
  for (const dailyData of monthlyData) {
    for (const stockData of dailyData) {
      flattenedData.push(stockData);
    }
  }

  return flattenedData;
}

export default {
  initializeDataBaseInteractor,
  flattenData,
};
