import { createI18n } from '@paternina/intlayer';

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      users: [
        { name: 'Alice', role: 'admin' },
        { name: 'Bob', role: 'user' }
      ],
      escaped: 'Use \\{variable\\} for interpolation, and \\# in plural blocks if you need a literal hash.',
      items: '{count, plural, =0 {No items} =1 {One item} other {# items}}'
    }
  }
});

console.log('--- Array notation ---');
console.log('User 0 name:', i18n.t('users[0].name'));
console.log('User 1 role:', i18n.t('users[1].role'));

console.log('\n--- Escaped characters ---');
console.log(i18n.t('escaped'));

console.log('\n--- Exact Plural Matches ---');
console.log('Count 0:', i18n.t('items', { count: 0 }));
console.log('Count 1:', i18n.t('items', { count: 1 }));
console.log('Count 5:', i18n.t('items', { count: 5 }));
