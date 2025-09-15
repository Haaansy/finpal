const formatCurrency = (value: number, currency = 'PHP', locale = 'en-PH') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
};

export default formatCurrency