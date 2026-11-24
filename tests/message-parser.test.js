import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIncomingMessageContent } from '../lib/whatsapp/message-handler.js';

test('parses plain text and extendedTextMessage', () => {
  assert.deepEqual(
    extractIncomingMessageContent({ message: { conversation: '  مرحبا  ' } }),
    { text: 'مرحبا', selectedId: null, kind: 'text' }
  );

  assert.deepEqual(
    extractIncomingMessageContent({ message: { extendedTextMessage: { text: '1' } } }),
    { text: '1', selectedId: null, kind: 'text' }
  );
});

test('parses Baileys interactive list, button, and native flow replies', () => {
  const listMsg = extractIncomingMessageContent({
    message: {
      listResponseMessage: {
        title: 'أكاديمية اللغات',
        singleSelectReply: { selectedRowId: 'menu:languages' },
      },
    },
  });
  assert.equal(listMsg.selectedId, 'menu:languages');
  assert.equal(listMsg.kind, 'list_response');

  const btnMsg = extractIncomingMessageContent({
    message: {
      buttonsResponseMessage: {
        selectedButtonId: 'menu:tutor',
        selectedDisplayText: 'المعلم',
      },
    },
  });
  assert.equal(btnMsg.selectedId, 'menu:tutor');
  assert.equal(btnMsg.kind, 'button_response');

  const ephemeral = extractIncomingMessageContent({
    message: {
      ephemeralMessage: {
        message: {
          interactiveResponseMessage: {
            nativeFlowResponseMessage: {
              paramsJson: JSON.stringify({ id: 'menu:research' }),
            },
          },
        },
      },
    },
  });
  assert.equal(ephemeral.selectedId, 'menu:research');
});
