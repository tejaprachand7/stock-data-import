import configManager from './utilities/config-manager.js';
import databaseUtil from './utilities/database-util.js';
import dataConfigs from './data-config.json' assert { type: 'json' };

import { config } from 'dotenv';
config({ path: './process.env' });

async function main() {
  try {
    const dbInteractor = databaseUtil.initializeDataBaseInteractor();

    // Perform DB health check before processing.
    const dbHealthCheckPassed = dbInteractor.performHealthCheck();
    if (!dbHealthCheckPassed) {
      return;
    }

    // Handle Ctrl+C
    process.on('SIGINT', function () {
      cleanup(dbInteractor);
    });

    // Handle termination signals
    process.on('SIGTERM', function () {
      cleanup(dbInteractor);
    });

    await configManager.process(dataConfigs, dbInteractor);

    await dbInteractor.insertData(table, [data]);

    console.log('Finished processing the data configuration.');
    return;
  } catch (ex) {
    console.error('An exception has occurred : ' + ex.message);
  }
}

// Terminate gracefully.
async function cleanup(dbInteractor) {
  console.log('Shutting down...');
  await dbInteractor.close();
  process.exit(0);
}

main();
