// Run with: node --test tests/validate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const v = require('../src/validate.js');

test('Israeli ID: valid check digits', () => {
  for (const id of ['000000018', '123456782', '12345678-2', '018']) {
    assert.equal(v.isValidIsraeliId(id), id !== '018', id);
  }
});

test('Israeli ID: wrong check digit, letters, too long', () => {
  for (const id of ['123456789', '00000001a', '1234567890', '']) {
    assert.equal(v.isValidIsraeliId(id), false, id);
  }
});

test('Israeli ID: short numbers are left-padded', () => {
  assert.equal(v.isValidIsraeliId('00018'), true);
});

test('phone: mobile, landline, international prefix, formatting', () => {
  for (const p of ['050-1234567', '0501234567', '+972 50 123 4567', '972501234567', '03-1234567', '(02) 123-4567', '077-1234567']) {
    assert.equal(v.isValidIsraeliPhone(p), true, p);
  }
});

test('phone: too short, too long, not Israeli', () => {
  for (const p of ['050123456', '05012345678', '1234567890', '06-1234567', 'abc']) {
    assert.equal(v.isValidIsraeliPhone(p), false, p);
  }
});

test('name: needs two letters and no digits', () => {
  assert.equal(v.isValidName('ישראל ישראלי'), true);
  assert.equal(v.isValidName('Иван'), true);
  assert.equal(v.isValidName('ሰላም'), true);
  assert.equal(v.isValidName('א'), false);
  assert.equal(v.isValidName('ישראל 2'), false);
});

test('form: ID or phone is required, and each must be valid when given', () => {
  assert.deepEqual(v.validateForm({ name: 'ישראל ישראלי', id: '', phone: '0501234567' }), {});
  assert.deepEqual(v.validateForm({ name: 'ישראל ישראלי', id: '000000018', phone: '' }), {});
  assert.deepEqual(v.validateForm({ name: '', id: '', phone: '' }), { name: 'nameRequired', phone: 'idOrPhone' });
  assert.deepEqual(v.validateForm({ name: 'ישראל ישראלי', id: '123456789', phone: '12' }), { id: 'idInvalid', phone: 'phoneInvalid' });
});
