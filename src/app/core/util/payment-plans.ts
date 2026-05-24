export const PAYMENT_PLANS = [
  {
    id: 'basic_plan',
    name: 'ClinicWell',
    description: 'Unlimited patients.\n15 GB of storage',
    prices: [
      { type: 'renewable', duration: 'Yearly', price: 180, encourage: 'Save $24/year', priceId: 'price_1TYjpiL1GUsmtJ6HczlY5h7I' },
      { type: 'renewable', duration: 'Monthly', price: 17, encourage: '', priceId: 'price_1TYjpiL1GUsmtJ6HZ5EyXNJ0' },
      { type: 'non-renewable', duration: 'One Year', price: 220, encourage: '', priceId: 'price_1TYjpiL1GUsmtJ6H7EcQ9H3T' },
      { type: 'non-renewable', duration: 'One Month', price: 20, encourage: '', priceId: 'price_1TYjpiL1GUsmtJ6HwwbMFh5E' },
    ],
  },
  // {
  //   id: 'pro_plan',
  //   name: 'Pro Plan',
  //   description: 'Up to 6000 patients.\nUp to 25 GB of storage.',
  //   prices: [
  //     { type: 'renewable', duration: 'Yearly', price: 420, encourage: 'Save $48/year', priceId: 'price_1TRf2bQ9YgX6ekXrYpwNe4vg' },
  //     { type: 'renewable', duration: 'Monthly', price: 39, encourage: '', priceId: 'price_1TRf21Q9YgX6ekXrcuVQYGZN' },
  //     { type: 'non-renewable', duration: 'One Year', price: 500, encourage: '', priceId: 'price_1TRy62Q9YgX6ekXrH4nHs4nb' },
  //     { type: 'non-renewable', duration: 'One Month', price: 44, encourage: '', priceId: 'price_1TRf31Q9YgX6ekXrR0R9FWof' },
  //   ],
  // },
];
