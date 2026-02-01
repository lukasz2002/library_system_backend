const ALLOWED_USER_UPDATE_FIELDS = [
  "firstName",
  "lastName",
  "addressNumber",
  "addressStreet",
  "addressCity",
  "addressCountry",
  "addressEmail",
  "phoneNumber",
];

const ALLOWED_BOOK_UPDATE_FIELDS = [
  "isbn",
  "title",
  "author",
  "publisher",
  "publishedYear",
  "quantity",
  "lostCount",
  "damagedCount",
  "location",
];

const MAX_ACTIVE_ENGAGEMENTS = 2;
const EXPECTANCY_EXPIRY_DAYS = 2;
const EXPIRY_MS = EXPECTANCY_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
const LOAN_DURATION_DAYS = 14;

module.exports = {
  ALLOWED_USER_UPDATE_FIELDS,
  ALLOWED_BOOK_UPDATE_FIELDS,
  MAX_ACTIVE_ENGAGEMENTS,
  EXPECTANCY_EXPIRY_DAYS,
  EXPIRY_MS,
  LOAN_DURATION_DAYS,
};
