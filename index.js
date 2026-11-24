import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { loadConfig } from './config.js';
import { bootstrapApplication } from './main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAIN_ENTRY = path.join(__dirname, 'main.js');

export class WorkerSupervisor {
  constructor({ entryPath = MAIN_ENTRY, maxRapidRestarts = 5, rapidWindowMs = 60_000 } = {}) {
    this.entryPath = entryPath;
    this.maxRapidRestarts = maxRapidRestarts;
    this.rapidWindowMs = rapidWindowMs;
    this.activeWorker = null;
    this.isShuttingDown = false;
    this.restartRequested = false;
    this.restartTimestamps = [];
    this.rl = null;
  }

  start() {
    if (this.isShuttingDown || this.activeWorker) return this.activeWorker;
    this._setupConsole();
    return this._spawnWorker();
  }

  _setupConsole() {
    if (this.rl || !process.stdin.isTTY) return;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.rl.on('line', (line) => {
      const cmd = line.trim().toLowerCase();
      if (cmd === 'restart' || cmd === 'reset') {
        this.restart();
      } else if (cmd === 'reload') {
        this.activeWorker?.postMessage({ type: 'reload' });
      } else if (cmd === 'exit' || cmd === 'quit') {
        void this.shutdown('STDIN_EXIT').then(() => process.exit(0));
      }
    });
  }

  _spawnWorker() {
    const worker = new Worker(this.entryPath);
    this.activeWorker = worker;

    worker.on('message', (msg) => {
      const type = typeof msg === 'string' ? msg : msg?.type;
      if (type === 'reset' || type === 'restart') {
        this.restart();
      }
    });

    worker.on('error', (err) => {
      console.error('Worker runtime error:', err.message);
    });

    worker.on('exit', (code) => {
      if (this.activeWorker === worker) {
        this.activeWorker = null;
      }

      if (this.isShuttingDown) {
        return;
      }

      if (this.restartRequested || code !== 0) {
        this.restartRequested = false;
        const now = Date.now();
        this.restartTimestamps = this.restartTimestamps.filter((ts) => now - ts < this.rapidWindowMs);
        this.restartTimestamps.push(now);

        if (this.restartTimestamps.length > this.maxRapidRestarts) {
          console.error('Worker exceeded rapid restart limit; stopping supervisor to prevent crash loop.');
          process.exit(1);
          return;
        }

        const delayMs = code === 0 ? 250 : 1500;
        setTimeout(() => {
          if (!this.isShuttingDown) {
            this._spawnWorker();
          }
        }, delayMs);
      }
    });

    return worker;
  }

  restart() {
    if (this.isShuttingDown) return;
    this.restartRequested = true;
    if (this.activeWorker) {
      this.activeWorker.postMessage({ type: 'shutdown' });
    } else {
      this._spawnWorker();
    }
  }

  async shutdown(signal = 'SIGTERM') {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    const worker = this.activeWorker;
    if (!worker) return;

    await new Promise((resolve) => {
      const forceTimer = setTimeout(() => {
        void worker.terminate().finally(resolve);
      }, 4000);
      if (typeof forceTimer.unref === 'function') forceTimer.unref();

      worker.once('exit', () => {
        clearTimeout(forceTimer);
        resolve();
      });
      worker.postMessage({ type: 'shutdown', signal });
    });
  }
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectExecution) {
  const cfg = loadConfig(process.env);
  if (!cfg.useWorkerSupervisor) {
    bootstrapApplication()
      .then((appCtx) => {
        const onSignal = (sig) => {
          appCtx
            .shutdown(sig)
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
        };
        process.on('SIGINT', () => onSignal('SIGINT'));
        process.on('SIGTERM', () => onSignal('SIGTERM'));
      })
      .catch((err) => {
        console.error('Fatal startup error:', err.message);
        process.exit(1);
      });
  } else {
    const supervisor = new WorkerSupervisor();
    supervisor.start();

    const onSignal = (sig) => {
      supervisor
        .shutdown(sig)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    };
    process.on('SIGINT', () => onSignal('SIGINT'));
    process.on('SIGTERM', () => onSignal('SIGTERM'));
  }
}
