// concurrency-pool.js
import os from 'os';

// This class controls and limits the rate of the concurrent asynchronous tasks running at a given time.
class TaskScheduler {
  // set the number of maximum concurrent tasks to the number of cores available in the CPU.
  constructor(maxConcurrentTasks) {
    this.maxConcurrentTasks = maxConcurrentTasks;
    this.runningTasks = 0;
    this.taskQueue = [];
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.totalTasks = 0;
  }

  async addTask(taskInfo, taskExecutionFunc) {
    return new Promise((resolve, reject) => {
      const task = {
        info: taskInfo,
        executor: taskExecutionFunc,
        resolve,
        reject,
      };

      this.taskQueue.push(task);
      this.totalTasks++;
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.runningTasks >= this.maxConcurrentTasks || this.taskQueue.length === 0) {
      return;
    }

    const task = this.taskQueue.shift();
    this.runningTasks++;

    try {
      const result = await task.executor(task.info);
      this.completedTasks++;
      task.resolve(result);
    } catch (error) {
      this.failedTasks++;
      console.error('Task failed:', error);
      task.reject(error);
    } finally {
      this.runningTasks--;
      this.processQueue();
    }
  }

  async addBatchOfTasks(taskInfoArr, taskExecutionFunc) {
    const taskCompletionPromises = taskInfoArr.map((taskInfo) =>
      this.addTask(taskInfo, taskExecutionFunc)
    );
    return Promise.all(taskCompletionPromises);
  }

  getStats() {
    return {
      total: this.totalTasks,
      completed: this.completedTasks,
      failed: this.failedTasks,
      queued: this.taskQueue.length,
      running: this.runningTasks,
    };
  }

  async waitForCompletion() {
    if (this.runningTasks === 0 && this.taskQueue.length === 0) {
      return;
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.runningTasks === 0 && this.taskQueue.length === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
}

let instance = null;

/* SINGLETON DESIGN PATTERN IMPLEMENTATION */
function getTaskScheduler(maxConcurrent = os.cpus().length) {
  if (!instance) {
    instance = new TaskScheduler(maxConcurrent);
  }
  return instance;
}

export default {
  getTaskScheduler,
};

// This works because Node.js caches modules after they're first required, so every file that imports this module will receive the same instance.
// you could implement a singleton design pattern here if you'd like.
// export default new TaskScheduler();
