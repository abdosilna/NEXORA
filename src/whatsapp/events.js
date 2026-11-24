export function bindWhatsAppEvents({ sock, saveCreds, onConnectionUpdate, onMessagesUpsert, logger }) {
  sock.ev.on('creds.update', async () => {
    try {
      await saveCreds();
    } catch (err) {
      logger?.error?.('whatsapp-events', 'Failed saving WhatsApp credentials', err);
    }
  });

  sock.ev.on('connection.update', (update) => {
    void onConnectionUpdate(update);
  });

  sock.ev.on('messages.upsert', (event) => {
    void onMessagesUpsert(event);
  });
}
