// Use type safe message keys with `next-intl`
type Messages = typeof import('./messages/ru.json');
declare interface IntlMessages extends Messages {}
