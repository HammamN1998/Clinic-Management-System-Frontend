export const PAYMENT_PLANS = [
  {
    id: 'basic_plan',
    name: 'Basic Plan',
    description: 'Up to 2000 patients.\nUp to 5 GB of storage.',
    prices: [
      { type: 'renewable', duration: 'Monthly', price: 15, description: '$15 per month', priceId: 'price_1SJWlqQ9YgX6ekXrvHEsDSF9' },
      { type: 'renewable', duration: 'Yearly', price: 144, description: '$144 per year', priceId: 'price_1TQYexQ9YgX6ekXrofQDmLlB' },
      { type: 'non-renewable', duration: 'One Month', price: 20, description: '$20 for one month', priceId: 'price_1TRXLUQ9YgX6ekXrwF32kcaz' },
      { type: 'non-renewable', duration: 'One Year', price: 240, description: '$240 for one year', priceId: 'price_1TRxzRQ9YgX6ekXrCrNO5QrE' },
    ],
  },
  {
    id: 'pro_plan',
    name: 'Pro Plan',
    description: 'Up to 6000 patients.\nUp to 25 GB of storage.',
    prices: [
      { type: 'renewable', duration: 'Monthly', price: 39, description: '$39 per month', priceId: 'price_1TRf21Q9YgX6ekXrcuVQYGZN' },
      { type: 'renewable', duration: 'Yearly', price: 396, description: '$396 per year', priceId: 'price_1TRf2bQ9YgX6ekXrYpwNe4vg' },
      { type: 'non-renewable', duration: 'One Month', price: 44, description: '$44 for one month', priceId: 'price_1TRf31Q9YgX6ekXrR0R9FWof' },
      { type: 'non-renewable', duration: 'One Year', price: 528, description: '$528 for one month', priceId: 'price_1TRy62Q9YgX6ekXrH4nHs4nb' },
    ],
  },
];
