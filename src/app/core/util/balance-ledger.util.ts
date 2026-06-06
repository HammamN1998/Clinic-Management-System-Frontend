import { AppointmentModel } from '@core/models/appointment.model';
import { PaymentModel } from '@core/models/payment.model';
import { TreatmentModel } from '@core/models/treatment.model';

export type BalanceLedgerLine = TreatmentModel | AppointmentModel | PaymentModel;

export interface BalanceLedgerResult {
  combinedList: BalanceLedgerLine[];
  totalBalance: number;
  /** Sum of treatment net (price - discount) plus unpaid appointment costs. */
  totalCharges: number;
  /** Sum of recorded patient payments. */
  totalPayments: number;
}

export function buildBalanceLedger(
  treatments: TreatmentModel[],
  payments: PaymentModel[],
  appointments: AppointmentModel[],
): BalanceLedgerResult {
  const unpaidAppointments = appointments.filter((a) => !a.costPaid);
  const combinedList: BalanceLedgerLine[] = [
    ...treatments,
    ...unpaidAppointments,
    ...payments,
  ];
  combinedList.sort(
    (a, b) => b.date.toDate().getTime() - a.date.toDate().getTime(),
  );

  let totalCharges = 0;
  treatments.forEach((t) => {
    totalCharges += t.price - t.discount;
  });
  appointments.forEach((a) => {
    if (!a.costPaid) {
      totalCharges += a.cost;
    }
  });

  let totalPayments = 0;
  payments.forEach((p) => {
    totalPayments += p.amount;
  });

  const totalBalance = totalCharges - totalPayments;

  return { combinedList, totalBalance, totalCharges, totalPayments };
}
