import { AppointmentModel } from '@core/models/appointment.model';
import { PaymentModel } from '@core/models/payment.model';
import { TreatmentModel } from '@core/models/treatment.model';

export type BalanceLedgerLine = TreatmentModel | AppointmentModel | PaymentModel;

export interface BalanceLedgerResult {
  combinedList: BalanceLedgerLine[];
  totalBalance: number;
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

  let totalBalance = 0;
  treatments.forEach((t) => {
    totalBalance += t.price - t.discount;
  });
  appointments.forEach((a) => {
    if (!a.costPaid) {
      totalBalance += a.cost;
    }
  });
  payments.forEach((p) => {
    totalBalance -= p.amount;
  });

  return { combinedList, totalBalance };
}
