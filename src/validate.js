// Form validators. Inlined into index.html by build.py and tested by tests/validate.test.mjs.

// Israeli ID number: up to 9 digits, left-padded with zeros, with a Luhn-style check digit.
function isValidIsraeliId(raw) {
  const digits = String(raw).replace(/[\s-]/g, '');
  if (!/^\d{5,9}$/.test(digits)) return false;
  const padded = digits.padStart(9, '0');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(padded[i]) * (i % 2 === 0 ? 1 : 2);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0;
}

// Israeli phone number in local form: mobile 05X (10 digits), 07X (10 digits) or landline 0[2-4,8,9] (9 digits).
// Accepts spaces, dashes, parentheses and a +972 / 972 prefix.
function normalizeIsraeliPhone(raw) {
  let digits = String(raw).replace(/[\s\-()]/g, '');
  if (digits.startsWith('+972')) digits = '0' + digits.slice(4);
  else if (digits.startsWith('972')) digits = '0' + digits.slice(3);
  return digits;
}

function isValidIsraeliPhone(raw) {
  const phone = normalizeIsraeliPhone(raw);
  return /^05\d{8}$/.test(phone) || /^07\d{8}$/.test(phone) || /^0[23489]\d{7}$/.test(phone);
}

// A full name: at least two letters, no digits.
function isValidName(raw) {
  const name = String(raw).trim();
  return (name.match(/\p{L}/gu) || []).length >= 2 && !/\d/.test(name);
}

// Returns {field: errorKey} for every problem; an empty object means the form is valid.
function validateForm({ name, id, phone }) {
  const errors = {};
  if (!name.trim()) errors.name = 'nameRequired';
  else if (!isValidName(name)) errors.name = 'nameInvalid';
  if (id.trim() && !isValidIsraeliId(id)) errors.id = 'idInvalid';
  if (phone.trim() && !isValidIsraeliPhone(phone)) errors.phone = 'phoneInvalid';
  if (!id.trim() && !phone.trim()) errors.phone = 'idOrPhone';
  return errors;
}

if (typeof module !== 'undefined') {
  module.exports = { isValidIsraeliId, isValidIsraeliPhone, normalizeIsraeliPhone, isValidName, validateForm };
}
