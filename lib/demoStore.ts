import { hashPassword, verifyPassword } from "@/lib/auth";

type User = {
  username: string;
  passwordHash: string;
  role: "admin" | "user";
};

export type PortfolioItem = {
  username: string;
  coinId: string;
  coinSymbol: string;
  buyPrice: number;
  amount: number;
  kayitId: number;
};

export type TransactionItem = {
  id: number;
  username: string;
  type: "BUY" | "SELL";
  coinId: string;
  coinSymbol: string;
  price: number;
  amount: number;
  total: number;
  createdAt: string;
};

const users: User[] = [
  { username: "admin", passwordHash: hashPassword("123456"), role: "admin" },
  { username: "ogrenci", passwordHash: hashPassword("123456"), role: "user" },
];

let portfolio: PortfolioItem[] = [
  { username: "admin", coinId: "bitcoin", coinSymbol: "btc", buyPrice: 64200, amount: 0.12, kayitId: 1 },
  { username: "admin", coinId: "ethereum", coinSymbol: "eth", buyPrice: 3150, amount: 1.8, kayitId: 2 },
  { username: "admin", coinId: "gram-altin", coinSymbol: "GRAM", buyPrice: 2910, amount: 8, kayitId: 3 },
  { username: "ogrenci", coinId: "solana", coinSymbol: "sol", buyPrice: 142, amount: 12, kayitId: 4 },
];

let nextPortfolioId = 5;
let logCount = 18;
let nextTransactionId = 7;

const now = new Date();

const transactions: TransactionItem[] = [
  {
    id: 1,
    username: "admin",
    type: "BUY",
    coinId: "bitcoin",
    coinSymbol: "btc",
    price: 64200,
    amount: 0.12,
    total: 7704,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: 2,
    username: "admin",
    type: "BUY",
    coinId: "ethereum",
    coinSymbol: "eth",
    price: 3150,
    amount: 1.8,
    total: 5670,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 3,
    username: "admin",
    type: "BUY",
    coinId: "gram-altin",
    coinSymbol: "GRAM",
    price: 2910,
    amount: 8,
    total: 23280,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 4,
    username: "ogrenci",
    type: "BUY",
    coinId: "solana",
    coinSymbol: "sol",
    price: 142,
    amount: 12,
    total: 1704,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 5,
    username: "admin",
    type: "SELL",
    coinId: "bitcoin",
    coinSymbol: "btc",
    price: 66900,
    amount: 0.03,
    total: 2007,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: 6,
    username: "admin",
    type: "BUY",
    coinId: "ethereum",
    coinSymbol: "eth",
    price: 3265,
    amount: 0.4,
    total: 1306,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString(),
  },
];

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.ORACLE_PASSWORD;
}

export function login(username: string, password: string) {
  const user = users.find((candidate) => candidate.username === username);
  return Boolean(user && verifyPassword(password, user.passwordHash));
}

export function register(username: string, password: string) {
  if (!username || !password) {
    return { success: false, message: "Username and password are required." };
  }

  if (users.some((user) => user.username === username)) {
    return { success: false, message: "This username is already taken." };
  }

  users.push({ username, passwordHash: hashPassword(password), role: "user" });
  logCount += 1;
  return { success: true, message: "Account created. You can sign in now." };
}

export function listPortfolio(username: string) {
  return portfolio.filter((item) => item.username === username);
}

export function listTransactions(username: string) {
  return transactions
    .filter((item) => item.username === username)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addAsset(input: Omit<PortfolioItem, "kayitId">) {
  const existing = portfolio.find(
    (item) => item.username === input.username && item.coinId === input.coinId,
  );

  if (existing) {
    const totalAmount = existing.amount + input.amount;
    existing.buyPrice = (existing.buyPrice * existing.amount + input.buyPrice * input.amount) / totalAmount;
    existing.amount = totalAmount;
  } else {
    portfolio.push({ ...input, kayitId: nextPortfolioId++ });
  }

  transactions.unshift({
    id: nextTransactionId++,
    username: input.username,
    type: "BUY",
    coinId: input.coinId,
    coinSymbol: input.coinSymbol,
    price: input.buyPrice,
    amount: input.amount,
    total: input.buyPrice * input.amount,
    createdAt: new Date().toISOString(),
  });
  logCount += 1;
}

export function sellAsset(username: string, coinId: string, amount: number, price?: number) {
  const existing = portfolio.find((item) => item.username === username && item.coinId === coinId);

  if (!existing) {
    return { success: false, message: "This asset was not found in the portfolio." };
  }

  if (amount > existing.amount) {
    return { success: false, message: "Sale amount cannot exceed the portfolio amount." };
  }

  const transactionPrice = price && price > 0 ? price : existing.buyPrice;
  transactions.unshift({
    id: nextTransactionId++,
    username,
    type: "SELL",
    coinId,
    coinSymbol: existing.coinSymbol,
    price: transactionPrice,
    amount,
    total: transactionPrice * amount,
    createdAt: new Date().toISOString(),
  });

  existing.amount = Number((existing.amount - amount).toFixed(8));
  if (existing.amount <= 0) {
    portfolio = portfolio.filter((item) => item !== existing);
  }

  logCount += 1;
  return { success: true, message: "Sale completed." };
}

export function stats() {
  return {
    users: users.length,
    tracking: portfolio.length,
    logs: logCount,
  };
}
