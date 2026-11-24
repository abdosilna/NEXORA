import { extractIncomingMessageContent, resolveSenderJid } from './simple.js';
import { createMessageHandler } from '../../handler.js';

export { extractIncomingMessageContent, resolveSenderJid };

export class IncomingMessageHandler {
  constructor({ config, repos, router, modules = null, pluginManager = null, sender, logger = null }) {
    this.delegate = createMessageHandler({
      config,
      repos,
      router,
      modules,
      pluginManager,
      sender,
      logger,
    });
  }

  async handleUpsert(event) {
    return this.delegate.handleUpsert(event);
  }

  async handleGroupParticipantsUpdate(event) {
    return this.delegate.handleGroupParticipantsUpdate(event);
  }

  async handleGroupsUpdate(event) {
    return this.delegate.handleGroupsUpdate(event);
  }
}
