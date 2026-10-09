import { AppointmentModel } from '@core/models/appointment.model';
import { PaymentModel } from '@core/models/payment.model';
import { TreatmentModel } from '@core/models/treatment.model';

export type BalanceLedgerLine = TreatmentModel | AppointmentModel | PaymentModel;

export interface BalanceLedgerResult {
  combinedList: BalanceLedgerLine[];
  totalBalance: number;
  /** Sum of treatment net (price - discount) plus every appointment cost, settled or not. */
  totalCharges: number;
  /** Sum of recorded patient payments plus the appointments settled at the chair. */
  totalPayments: number;
}

/** Firestore records predating a field hold undefined; left raw they turn the running total into NaN. */
export function amount(value: number | undefined | null): number {
  return Number.isFinite(value) ? (value as number) : 0;
}

/**
 * An appointment settled at the chair lands on both sides: its cost is work charged
 * and the same figure is money taken. That nets to zero in the balance but keeps the
 * two subtotals honest about how much was billed and how much came in.
 *
 * Free appointments carry no cost and are left out of the itemized list so routine
 * check-ups do not fill an invoice with zero rows.
 */
export function buildBalanceLedger(
  treatments: TreatmentModel[],
  payments: PaymentModel[],
  appointments: AppointmentModel[],
): BalanceLedgerResult {
  const billableAppointments = appointments.filter((a) => amount(a.cost) !== 0);
  const combinedList: BalanceLedgerLine[] = [
    ...treatments,
    ...billableAppointments,
    ...payments,
  ];
  combinedList.sort(
    (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime(),
  );

  let totalCharges = 0;
  treatments.forEach((t) => {
    totalCharges += amount(t.price) - amount(t.discount);
  });
  appointments.forEach((a) => {
    totalCharges += amount(a.cost);
  });

  let totalPayments = 0;
  payments.forEach((p) => {
    totalPayments += amount(p.amount);
  });
  appointments.forEach((a) => {
    if (a.costPaid) {
      totalPayments += amount(a.cost);
    }
  });

  const totalBalance = totalCharges - totalPayments;

  return { combinedList, totalBalance, totalCharges, totalPayments };
}
