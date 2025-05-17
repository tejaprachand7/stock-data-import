/**
 * DBInteractor.js
 */

import { Pool } from 'pg';

class DBInteractor {
  constructor(dbConfig) {
    this.pool = new Pool({
      ...dbConfig,
      // Connection pool settings for optimal performance
      maxClients: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 2000, // How long to wait for a connection to be established
    });
    this.batchSize = dbConfig.batchSize || 1000;
  }

  async insertData(table, data) {
    let stats = {
      totalRecords: data.length,
      successfulRecords: 0,
      failedRecords: 0,
      startTime: Date.now(),
      endTime: null,
      durationMs: null,
    };

    try {
      // Process data in batches for better performance
      const batchSize = this.batchSize;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const result = await this._insertBatch(batch, table);
        stats.successfulRecords += result.success;
        stats.failedRecords += result.failed;
      }

      stats.endTime = Date.now();
      stats.durationMs = stats.endTime - stats.startTime;

      return stats;
    } catch (error) {
      throw new Error(`Failed to insert data: ${error.message}`);
    }
  }

  async _insertBatch(batch, table) {
    // quickly get an exiting connection from the connection pool.
    const client = await this.pool.connect();
    let result = { success: 0, failed: 0 };

    try {
      await client.query('BEGIN');

      let columns = null;

      // Prepare the batch insert query with parameterized values
      let values = [];
      let valuePlaceholders = [];
      let paramIndex = 1;

      for (const record of batch) {
        if (!columns) {
          columns = Object.keys(record);
        }

        try {
          // Generate parameterized values for each record
          valuePlaceholders.push(
            `(${Array.from({ length: columns.length }, (_, i) => `$${paramIndex++}`).join(', ')})`
          );

          // Extract values from the record
          columns.forEach(function (column) {
            values.push(record[column]);
          });

          result.success++;
        } catch (parseError) {
          result.failed++;
          console.log(
            `Data parsing error : ${parseError} for the record : ${JSON.stringify(record)}`
          );
        }
      }

      if (valuePlaceholders.length > 0) {
        // TODO : think about the on conflict clause.
        const query = `
          INSERT INTO ${table} (${columns.join(', ')}) 
          VALUES ${valuePlaceholders.join(', ')}
        `;

        await client.query(query, values);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      result.success = 0;
      result.failed = batch.length;
      throw error;
    } finally {
      client.release();
    }

    return result;
  }

  /**
   * Close the database connection pool
   */
  async close() {
    try {
      await this.pool.end();
      console.log('Database connection pool closed');
    } catch (error) {
      console.error('Error closing database connection pool:', error);
    }
  }

  async performHealthCheck() {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } catch (error) {
      console.error(`DB Health check failed due to error - ${error.message}`);
      return false;
    } finally {
      client.release();
    }
  }
}

export default DBInteractor;
