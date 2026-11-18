import { Injectable } from '@angular/core';
import * as firestore from 'firebase/firestore';
import { amount } from '@core/util/balance-ledger.util';

/**
 * All-time totals of an account's records for the clinic dashboard. They are sum queries, which
 * Firestore answers from its indexes for one read per 1,000 records.
 */
@Injectable({ providedIn: 'root' })
export class ClinicRecordsService {
  /**
   * What the account's patients owe in all, worked out like a patient's balance: treatments after
   * discount plus appointment fees, less payments and the fees marked paid. A patient who paid
   * ahead lowers it.
   */
  async outstanding(doctorId: string): Promise<number> {
    const [prices, discounts, fees, paidFees, payments] = await Promise.all([
      this.sum('treatments', 'price', doctorId),
      this.sum('treatments', 'discount', doctorId),
      this.sum('appointments', 'cost', doctorId),
      this.sum('appointments', 'cost', doctorId, [firestore.where('costPaid', '==', true)]),
      this.sum('payments', 'amount', doctorId),
    ]);
    return prices - discounts + fees - paidFees - payments;
  }

  /** Each sum is its own query: one query summing several fields counts only records that have them all. */
  private async sum(collection: string, field: string, doctorId: string, filters: firestore.QueryConstraint[] = []): Promise<number> {
    const query = firestore.query(
      firestore.collection(firestore.getFirestore(), collection),
      firestore.where('doctorId', '==', doctorId),
      ...filters,
    );
    const snapshot = await firestore.getAggregateFromServer(query, { total: firestore.sum(field) });
    return amount(snapshot.data().total);
  }
}
