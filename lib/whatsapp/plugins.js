import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function normalizePluginDefinition(rawMod, filename) {
  const candidate = rawMod?.default && typeof rawMod.default === 'object' ? rawMod.default : rawMod;
  const fallbackHandler = typeof rawMod?.default === 'function' ? rawMod.default : null;
  const handler = candidate?.handler || candidate?.run || fallbackHandler;

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const name = String(candidate.name || filename.replace(/\.js$/i, '')).trim();
  const commands = normalizeCommands(candidate.command);
  const hasHooks =
    typeof handler === 'function' ||
    typeof candidate.before === 'function' ||
    typeof candidate.all === 'function' ||
    typeof candidate.after === 'function';

  if (!hasHooks) {
    return null;
  }

  return {
    name,
    filename,
    disabled: Boolean(candidate.disabled),
    command: commands,
    rawCommand: candidate.command || null,
    help: Array.isArray(candidate.help) ? candidate.help : candidate.help ? [candidate.help] : [],
    tags: Array.isArray(candidate.tags) ? candidate.tags : [],
    group: Boolean(candidate.group),
    private: Boolean(candidate.private),
    admin: Boolean(candidate.admin),
    botAdmin: Boolean(candidate.botAdmin),
    owner: Boolean(candidate.owner),
    all: typeof candidate.all === 'function' ? candidate.all.bind(candidate) : null,
    before: typeof candidate.before === 'function' ? candidate.before.bind(candidate) : null,
    handler: typeof handler === 'function' ? handler.bind(candidate) : null,
    after: typeof candidate.after === 'function' ? candidate.after.bind(candidate) : null,
  };
}

function normalizeCommands(cmd) {
  if (!cmd) return [];
  if (cmd instanceof RegExp) return [cmd];
  if (Array.isArray(cmd)) {
    return cmd.map((c) => (c instanceof RegExp ? c : String(c).trim().toLowerCase())).filter(Boolean);
  }
  return [String(cmd).trim().toLowerCase()].filter(Boolean);
}

export function matchPluginCommand(plugin, commandName) {
  if (!plugin || !commandName || plugin.disabled) return false;
  const clean = String(commandName).trim().toLowerCase();
  if (!clean) return false;

  for (const matcher of plugin.command) {
    if (matcher instanceof RegExp) {
      if (matcher.test(clean)) return true;
    } else if (matcher === clean) {
      return true;
    }
  }
  return false;
}

export class PluginManager {
  constructor({ pluginsDir = path.resolve('plugins'), logger = null, repos = null } = {}) {
    this.pluginsDir = path.resolve(pluginsDir);
    this.logger = logger;
    this.repos = repos;
    this.plugins = new Map();
    this.loadVersion = 0;
  }

  async loadPlugins() {
    this.loadVersion += 1;
    const loaded = new Map();

    let entries = [];
    try {
      entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
    } catch (err) {
      this.logger?.warn?.('plugins', `Plugins directory unavailable at ${this.pluginsDir}`, err.message);
      this.plugins = loaded;
      return [];
    }

    const pluginFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.js') && !e.name.startsWith('_'))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of pluginFiles) {
      const fullPath = path.join(this.pluginsDir, entry.name);
      try {
        const modUrl = `${pathToFileURL(fullPath).href}?v=${this.loadVersion}`;
        const imported = await import(modUrl);
        const normalized = normalizePluginDefinition(imported, entry.name);
        if (!normalized) {
          this.logger?.warn?.('plugins', `Skipped invalid plugin module: ${entry.name}`);
          continue;
        }
        loaded.set(normalized.name, normalized);
      } catch (err) {
        this.logger?.error?.('plugins', `Failed loading plugin ${entry.name}`, err);
      }
    }

    this.plugins = loaded;
    this.logger?.info?.('plugins', `Loaded ${loaded.size} plugins from ${this.pluginsDir}`);
    return this.listPlugins();
  }

  async reloadPlugins() {
    return this.loadPlugins();
  }

  listPlugins() {
    return Array.from(this.plugins.values()).filter((p) => !p.disabled);
  }

  findCommandPlugin(commandName) {
    for (const plugin of this.listPlugins()) {
      if (matchPluginCommand(plugin, commandName)) {
        return plugin;
      }
    }
    return null;
  }

  async runHook(hookName, m, ctx) {
    for (const plugin of this.listPlugins()) {
      const fn = plugin[hookName];
      if (typeof fn !== 'function') continue;
      try {
        const res = await fn(m, ctx);
        if (hookName === 'before' && res === true) {
          return { stopped: true, plugin };
        }
      } catch (err) {
        this.logger?.error?.('plugins', `Error in ${plugin.name}.${hookName}`, err);
        this.repos?.admin?.recordPluginRun?.({
          pluginName: plugin.name,
          ok: false,
          errorMessage: err.message,
        });
      }
    }
    return { stopped: false, plugin: null };
  }

  async executePlugin(plugin, m, ctx) {
    if (!plugin?.handler) return null;
    try {
      const result = await plugin.handler(m, ctx);
      this.repos?.admin?.recordPluginRun?.({
        pluginName: plugin.name,
        ok: true,
        errorMessage: '',
      });
      return result;
    } catch (err) {
      this.logger?.error?.('plugins', `Plugin execution failed (${plugin.name})`, err);
      this.repos?.admin?.recordPluginRun?.({
        pluginName: plugin.name,
        ok: false,
        errorMessage: err.message,
      });
      return {
        text: `⚠️ تعذر تنفيذ الأمر (${plugin.name}) مؤقتاً. أرسل *رئيسية* أو أعد المحاولة.`,
      };
    }
  }
}
