export function bindWhatsAppEvents({
  sock,
  saveCreds,
  onConnectionUpdate,
  onMessagesUpsert,
  onGroupParticipantsUpdate = null,
  onGroupsUpdate = null,
  logger = null,
}) {
  const listeners = {
    credsUpdate: async () => {
      try {
        await saveCreds();
      } catch (err) {
        logger?.error?.('whatsapp-events', 'Failed saving WhatsApp credentials', err);
      }
    },
    connectionUpdate: (update) => {
      void onConnectionUpdate(update);
    },
    messagesUpsert: (event) => {
      void onMessagesUpsert(event);
    },
    groupParticipantsUpdate: (event) => {
      if (onGroupParticipantsUpdate) {
        void onGroupParticipantsUpdate(event);
      }
    },
    groupsUpdate: (event) => {
      if (onGroupsUpdate) {
        void onGroupsUpdate(event);
      }
    },
  };

  sock.ev.on('creds.update', listeners.credsUpdate);
  sock.ev.on('connection.update', listeners.connectionUpdate);
  sock.ev.on('messages.upsert', listeners.messagesUpsert);
  sock.ev.on('group-participants.update', listeners.groupParticipantsUpdate);
  sock.ev.on('groups.update', listeners.groupsUpdate);

  return () => unbindWhatsAppEvents(sock, listeners);
}

export function unbindWhatsAppEvents(sock, listeners = null) {
  if (!sock?.ev) return;
  if (listeners && typeof sock.ev.off === 'function') {
    sock.ev.off('creds.update', listeners.credsUpdate);
    sock.ev.off('connection.update', listeners.connectionUpdate);
    sock.ev.off('messages.upsert', listeners.messagesUpsert);
    sock.ev.off('group-participants.update', listeners.groupParticipantsUpdate);
    sock.ev.off('groups.update', listeners.groupsUpdate);
    return;
  }

  sock.ev.removeAllListeners?.('creds.update');
  sock.ev.removeAllListeners?.('connection.update');
  sock.ev.removeAllListeners?.('messages.upsert');
  sock.ev.removeAllListeners?.('group-participants.update');
  sock.ev.removeAllListeners?.('groups.update');
}
