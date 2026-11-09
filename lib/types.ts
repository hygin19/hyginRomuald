export type Role = "user" | "admin";

export type Profile = {
  id: string;
  email: string;
  username: string;
  role: Role;
  balanceMga: number;
  createdAt: string;
};

export type RoundPhase = "waiting" | "flying" | "crashed";

export type GameRoundView = {
  id: string;
  no: number;
  phase: RoundPhase;
  /** epoch ms — fin de la période de mise */
  waitEndsAt: number;
  /** epoch ms — décollage */
  flyStartAt: number;
  /** epoch ms — crash */
  flyEndAt: number;
  /** révélé uniquement après le crash */
  crashMultiplier?: number;
};

export type BetView = {
  id: string;
  amountMga: number;
  status: "placed" | "cashed" | "lost";
  cashedOutMultiplier: number | null;
  payoutMga: number | null;
};

export type BetHistoryItem = BetView & {
  roundNo: number;
  crashMultiplier: number;
  createdAt: string;
};

export type HistoryEntry = {
  no: number;
  crashMultiplier: number;
  endedAt: number;
};

export type FeedEntry = {
  id: string;
  username: string;
  amountMga: number;
  status: "placed" | "cashed" | "lost";
  cashedOutMultiplier: number | null;
  payoutMga: number | null;
};

export type GameState = {
  serverNow: number;
  round: GameRoundView;
  history: HistoryEntry[];
  myBet: BetView | null;
  balance: number;
  nextRoundInMs: number;
  feed: FeedEntry[];
};

export type RoundStats = {
  totalRounds: number;
  average: number;
  maximum: number;
  minimum: number;
  last: number;
  under2: number;
  between2and5: number;
  between5and10: number;
  over10: number;
  lowStreak: number;
  highStreak: number;
};

export type Prediction = {
  id: string;
  targetRoundNo: number;
  predictedMultiplier: number;
  confidence: number;
  result: "pending" | "gagne" | "perdu";
  createdAt: string;
};

export type HonoreAdapterStatus = {
  configured: boolean;
  liveBettingEnabled: boolean;
  documentationVerified: boolean;
  mode: "demo";
  endpoints: { name: string; method: string; path: string; verified: boolean }[];
  notice: string;
};
