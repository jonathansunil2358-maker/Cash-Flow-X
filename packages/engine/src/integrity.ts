import { trialBalanceTotal } from './ledger/journal';
import { balanceSheet, cashFlowStatement } from './ledger/statements';
import { leasesCurrentPortion } from './model/leases';
import { currentPortion } from './model/loans';
import { queueTotal } from './model/workingCapital';
import type { GameState, MonthRecord } from './model/state';

/**
 * Accounting invariants, checked after every month (in the game, in tests and in the leaderboard
 * replay). Any failure means the engine has a bug, so the UI surfaces it prominently.
 */
export function checkIntegrity(s: GameState, record?: MonthRecord): string[] {
  const errors: string[] = [];
  const b = s.ledger.balances;
  const tag = (msg: string) => errors.push(`Month ${s.month}: ${msg}`);

  const tb = trialBalanceTotal(b);
  if (tb !== 0) tag(`trial balance does not sum to zero (${tb}p)`);

  const bs = balanceSheet(b, currentPortion(s.loans), leasesCurrentPortion(s.leases));
  if (bs.difference !== 0) tag(`balance sheet does not balance (difference ${bs.difference}p)`);

  if (record) {
    const cf = cashFlowStatement(record.period, record.closing.cash);
    if (!cf.reconciles) tag(`cash flow does not reconcile: opening ${cf.openingCash} + net ${cf.netChange} ≠ closing ${cf.closingCash}`);
    if (!cf.operatingTies) tag('operating cash flow does not tie back to profit for the period');
  }

  const rq = queueTotal(s.receivablesQueue);
  if (rq !== b.receivables) tag(`receivables subledger ${rq} ≠ control account ${b.receivables}`);
  const pq = queueTotal(s.payablesQueue);
  if (pq !== -b.payables) tag(`payables subledger ${pq} ≠ control account ${-b.payables}`);
  const dq = queueTotal(s.deferredSchedule);
  if (dq !== -b.deferredRevenue) tag(`deferred revenue schedule ${dq} ≠ control account ${-b.deferredRevenue}`);

  if (s.inventoryUnits < 0) tag('negative inventory units');
  if (b.inventory < 0) tag('negative inventory value');
  if (s.inventoryUnits === 0 && b.inventory !== 0) tag(`inventory value ${b.inventory} with zero units`);

  const cost = s.ppeAssets.reduce((a, x) => a + x.cost, 0);
  const acc = s.ppeAssets.reduce((a, x) => a + x.accumulated, 0);
  if (cost !== b.ppe) tag(`fixed asset register cost ${cost} ≠ PP&E ${b.ppe}`);
  if (acc !== -b.accumDepreciation) tag(`fixed asset register depreciation ${acc} ≠ ledger ${-b.accumDepreciation}`);

  const principal = s.loans.reduce((a, l) => a + l.principal, 0);
  if (principal !== -b.loans) tag(`loan schedules ${principal} ≠ loans ledger ${-b.loans}`);

  const rouCost = s.leases.reduce((a, l) => a + l.cost, 0);
  const rouAcc = s.leases.reduce((a, l) => a + l.accumulated, 0);
  const leaseLiab = s.leases.reduce((a, l) => a + l.liability, 0);
  if (rouCost !== b.rightOfUse) tag(`lease register cost ${rouCost} ≠ right-of-use assets ${b.rightOfUse}`);
  if (rouAcc !== -b.rouAccumDepreciation) tag(`lease register depreciation ${rouAcc} ≠ ledger ${-b.rouAccumDepreciation}`);
  if (leaseLiab !== -b.leaseLiability) tag(`lease schedules ${leaseLiab} ≠ lease liabilities ${-b.leaseLiability}`);

  const ventures = (s.ventures ?? []).reduce((a, v) => a + v.stake, 0) + (s.strat?.subs ?? []).reduce((a, v) => a + v.stake, 0);
  if (s.deposit + s.fundValue + ventures !== b.investments) tag(`investment holdings ${s.deposit + s.fundValue + ventures} ≠ ledger ${b.investments}`);
  if (b.prepayments < 0) tag('negative prepayments');
  if (b.accruals > 0) tag('accruals has a debit balance');
  return errors;
}
