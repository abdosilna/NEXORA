import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateOrReservedIp, validateSafePublicUrl } from '../src/security/ssrf.js';

test('blocks loopback, metadata, private IPv4, and link-local IPv6 addresses', async () => {
  assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
  assert.equal(isPrivateOrReservedIp('169.254.169.254'), true);
  assert.equal(isPrivateOrReservedIp('10.24.1.5'), true);
  assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
  assert.equal(isPrivateOrReservedIp('192.168.1.10'), true);
  assert.equal(isPrivateOrReservedIp('fe80::1'), true);
  assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);

  await assert.rejects(() => validateSafePublicUrl('http://localhost:3000/admin'));
  await assert.rejects(() => validateSafePublicUrl('http://169.254.169.254/latest/meta-data'));
  await assert.rejects(() => validateSafePublicUrl('file:///etc/passwd'));

  // DNS rebinding / private DNS resolution protection
  await assert.rejects(() =>
    validateSafePublicUrl('https://internal.example.com/secret', {
      resolveDns: async () => [{ address: '10.0.0.5', family: 4 }],
    })
  );

  const ok = await validateSafePublicUrl('https://en.wikipedia.org/wiki/Node.js', {
    resolveDns: async () => [{ address: '198.35.26.96', family: 4 }],
  });
  assert.equal(ok.hostname, 'en.wikipedia.org');
});
