import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INSUFFICIENT_BALANCE = 101;
const ERR_INVALID_AMOUNT = 102;
const ERR_INVALID_PROPOSAL_ID = 103;
const ERR_VOTING_NOT_APPROVED = 104;
const ERR_ALREADY_CLAIMED = 105;
const ERR_INVALID_MEMBER = 106;
const ERR_TREASURY_LOCKED = 107;
const ERR_INVALID_DISTRIBUTION = 108;

interface Investment {
  proposalId: number;
  amountInvested: number;
  returns: number;
  investedAt: number;
}

interface Claim {
  claimed: boolean;
  amount: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class TreasuryMock {
  state: {
    totalBalance: number;
    isLocked: boolean;
    lastDistributionHeight: number;
    memberBalances: Map<string, number>;
    memberShares: Map<string, number>;
    totalShares: number;
    investments: Map<number, Investment>;
    claims: Map<string, Claim>;
  } = {
    totalBalance: 0,
    isLocked: false,
    lastDistributionHeight: 0,
    memberBalances: new Map(),
    memberShares: new Map(),
    totalShares: 0,
    investments: new Map(),
    claims: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  owner: string = "ST1TEST";
  members: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];
  votingApprovals: Set<number> = new Set();

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      totalBalance: 0,
      isLocked: false,
      lastDistributionHeight: 0,
      memberBalances: new Map(),
      memberShares: new Map(),
      totalShares: 0,
      investments: new Map(),
      claims: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.members = new Set(["ST1TEST"]);
    this.stxTransfers = [];
    this.votingApprovals = new Set();
  }

  isMember(principal: string): boolean {
    return this.members.has(principal);
  }

  isAuthorized(principal: string): boolean {
    return principal === this.owner || this.isMember(principal);
  }

  checkVotingApproval(proposalId: number): Result<boolean> {
    return { ok: true, value: this.votingApprovals.has(proposalId) };
  }

  deposit(amount: number): Result<boolean> {
    if (!this.isMember(this.caller)) return { ok: false, value: ERR_INVALID_MEMBER };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.stxTransfers.push({ amount, from: this.caller, to: "contract" });
    const currentBalance = this.state.memberBalances.get(this.caller) || 0;
    this.state.memberBalances.set(this.caller, currentBalance + amount);
    this.state.totalBalance += amount;
    const currentShare = this.state.memberShares.get(this.caller) || 0;
    this.state.memberShares.set(this.caller, currentShare + amount);
    this.state.totalShares += amount;
    return { ok: true, value: true };
  }

  withdraw(amount: number): Result<boolean> {
    const balance = this.state.memberBalances.get(this.caller) || 0;
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (amount > balance) return { ok: false, value: ERR_INSUFFICIENT_BALANCE };
    if (this.state.isLocked) return { ok: false, value: ERR_TREASURY_LOCKED };
    if (!this.isMember(this.caller)) return { ok: false, value: ERR_INVALID_MEMBER };
    this.stxTransfers.push({ amount, from: "contract", to: this.caller });
    this.state.memberBalances.set(this.caller, balance - amount);
    this.state.totalBalance -= amount;
    const currentShare = this.state.memberShares.get(this.caller) || 0;
    this.state.memberShares.set(this.caller, currentShare - amount);
    this.state.totalShares -= amount;
    return { ok: true, value: true };
  }

  executeInvestment(proposalId: number, investAmount: number): Result<boolean> {
    if (!this.isAuthorized(this.caller)) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (investAmount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (proposalId <= 0) return { ok: false, value: ERR_INVALID_PROPOSAL_ID };
    const approval = this.checkVotingApproval(proposalId);
    if (!approval.ok || !approval.value) return { ok: false, value: ERR_VOTING_NOT_APPROVED };
    if (this.state.isLocked) return { ok: false, value: ERR_TREASURY_LOCKED };
    if (investAmount > this.state.totalBalance) return { ok: false, value: ERR_INSUFFICIENT_BALANCE };
    this.state.isLocked = true;
    this.state.investments.set(proposalId, {
      proposalId,
      amountInvested: investAmount,
      returns: 0,
      investedAt: this.blockHeight,
    });
    this.state.totalBalance -= investAmount;
    this.state.isLocked = false;
    return { ok: true, value: true };
  }

  recordReturns(proposalId: number, returns: number): Result<boolean> {
    if (!this.isAuthorized(this.caller)) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (proposalId <= 0) return { ok: false, value: ERR_INVALID_PROPOSAL_ID };
    if (!this.state.investments.has(proposalId)) return { ok: false, value: ERR_INVALID_PROPOSAL_ID };
    const inv = this.state.investments.get(proposalId)!;
    this.state.investments.set(proposalId, { ...inv, returns });
    this.state.totalBalance += returns;
    return { ok: true, value: true };
  }

  distributeReturns(): Result<boolean> {
    if (!this.isAuthorized(this.caller)) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.blockHeight <= this.state.lastDistributionHeight + 10) return { ok: false, value: ERR_INVALID_DISTRIBUTION };
    this.state.lastDistributionHeight = this.blockHeight;
    let totalRet = 0;
    this.members.forEach(member => {
      const share = this.state.memberShares.get(member) || 0;
      const totalSh = this.state.totalShares;
      const memberRet = share > 0 ? Math.floor((totalRet * share) / totalSh) : 0;
      this.state.claims.set(member, { claimed: false, amount: memberRet });
      totalRet += memberRet;
    });
    return { ok: true, value: true };
  }

  claimDistribution(): Result<boolean> {
    if (!this.isMember(this.caller)) return { ok: false, value: ERR_INVALID_MEMBER };
    const claim = this.state.claims.get(this.caller);
    if (!claim) return { ok: false, value: ERR_INVALID_DISTRIBUTION };
    if (claim.claimed) return { ok: false, value: ERR_ALREADY_CLAIMED };
    this.stxTransfers.push({ amount: claim.amount, from: "contract", to: this.caller });
    this.state.claims.set(this.caller, { ...claim, claimed: true });
    const balance = this.state.memberBalances.get(this.caller) || 0;
    this.state.memberBalances.set(this.caller, balance + claim.amount);
    return { ok: true, value: true };
  }

  lockTreasury(): Result<boolean> {
    if (this.caller !== this.owner) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.isLocked = true;
    return { ok: true, value: true };
  }

  unlockTreasury(): Result<boolean> {
    if (this.caller !== this.owner) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.isLocked = false;
    return { ok: true, value: true };
  }

  getTotalBalance(): Result<number> {
    return { ok: true, value: this.state.totalBalance };
  }

  getIsLocked(): Result<boolean> {
    return { ok: true, value: this.state.isLocked };
  }

  getClaimable(member: string): Result<number> {
    const claim = this.state.claims.get(member);
    return { ok: true, value: claim ? claim.amount : 0 };
  }
}

describe("TreasuryContract", () => {
  let contract: TreasuryMock;

  beforeEach(() => {
    contract = new TreasuryMock();
    contract.reset();
  });

  it("deposits funds successfully", () => {
    const result = contract.deposit(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.totalBalance).toBe(1000);
    expect(contract.state.memberBalances.get("ST1TEST")).toBe(1000);
    expect(contract.state.totalShares).toBe(1000);
  });

  it("rejects deposit from non-member", () => {
    contract.members = new Set();
    const result = contract.deposit(1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MEMBER);
  });

  it("withdraws funds successfully", () => {
    contract.deposit(1000);
    const result = contract.withdraw(500);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.totalBalance).toBe(500);
  });

  it("rejects withdraw when locked", () => {
    contract.deposit(1000);
    contract.lockTreasury();
    const result = contract.withdraw(500);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_TREASURY_LOCKED);
  });

  it("executes investment successfully", () => {
    contract.votingApprovals.add(1);
    contract.deposit(2000);
    const result = contract.executeInvestment(1, 1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.totalBalance).toBe(1000);
    expect(contract.state.investments.has(1)).toBe(true);
  });

  it("rejects investment without approval", () => {
    contract.deposit(2000);
    const result = contract.executeInvestment(1, 1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_VOTING_NOT_APPROVED);
  });

  it("records returns successfully", () => {
    contract.votingApprovals.add(1);
    contract.deposit(2000);
    contract.executeInvestment(1, 1000);
    const result = contract.recordReturns(1, 500);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.totalBalance).toBe(1500);
  });

  it("distributes returns successfully", () => {
    contract.deposit(1000);
    contract.blockHeight = 20;
    const result = contract.distributeReturns();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.claims.get("ST1TEST")?.claimed).toBe(false);
  });

  it("claims distribution successfully", () => {
    contract.deposit(1000);
    contract.blockHeight = 20;
    contract.distributeReturns();
    const result = contract.claimDistribution();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.claims.get("ST1TEST")?.claimed).toBe(true);
  });

  it("rejects claim if already claimed", () => {
    contract.deposit(1000);
    contract.blockHeight = 20;
    contract.distributeReturns();
    contract.claimDistribution();
    const result = contract.claimDistribution();
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ALREADY_CLAIMED);
  });

  it("locks and unlocks treasury", () => {
    const lockResult = contract.lockTreasury();
    expect(lockResult.ok).toBe(true);
    expect(contract.state.isLocked).toBe(true);
    const unlockResult = contract.unlockTreasury();
    expect(unlockResult.ok).toBe(true);
    expect(contract.state.isLocked).toBe(false);
  });

  it("rejects lock by non-owner", () => {
    contract.caller = "ST2TEST";
    const result = contract.lockTreasury();
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("gets total balance correctly", () => {
    contract.deposit(1000);
    const result = contract.getTotalBalance();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1000);
  });

  it("gets claimable amount correctly", () => {
    contract.deposit(1000);
    contract.blockHeight = 20;
    contract.distributeReturns();
    const result = contract.getClaimable("ST1TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
  });
});