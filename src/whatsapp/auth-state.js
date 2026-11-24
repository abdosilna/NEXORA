import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys';

const fileQueues = new Map();

function enqueueFileOp(filePath, fn) {
  const prev = fileQueues.get(filePath) || Promise.resolve();
  const next = prev.then(fn, fn);
  fileQueues.set(
    filePath,
    next.finally(() => {
      if (fileQueues.get(filePath) === next) {
        fileQueues.delete(filePath);
      }
    })
  );
  return next;
}

function fixFileName(file) {
  return String(file || '').replace(/\//g, '__').replace(/:/g, '-');
}

async function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  const tmpPath = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  const serialized = JSON.stringify(data, BufferJSON.replacer);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(tmpPath, serialized, { mode: 0o600 });
  await fs.rename(tmpPath, filePath);
}

export async function useAtomicMultiFileAuthState(folder) {
  const baseDir = path.resolve(folder);
  await fs.mkdir(baseDir, { recursive: true });

  const writeData = (data, file) => {
    const filePath = path.join(baseDir, fixFileName(file));
    return enqueueFileOp(filePath, () => atomicWriteJson(filePath, data));
  };

  const readData = (file) => {
    const filePath = path.join(baseDir, fixFileName(file));
    return enqueueFileOp(filePath, async () => {
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw, BufferJSON.reviver);
      } catch {
        return null;
      }
    });
  };

  const removeData = (file) => {
    const filePath = path.join(baseDir, fixFileName(file));
    return enqueueFileOp(filePath, async () => {
      try {
        await fs.unlink(filePath);
      } catch {
        // File already absent
      }
    });
  };

  const creds = (await readData('creds.json')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}.json`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              const file = `${category}-${id}.json`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      return writeData(creds, 'creds.json');
    },
  };
}
