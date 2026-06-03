type User = {
  username: string;
  password: string;
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

const users: User[] = [
  { username: "admin", password: "123456", role: "admin" },
  { username: "ogrenci", password: "123456", role: "user" },
];

let portfolio: PortfolioItem[] = [
  { username: "admin", coinId: "bitcoin", coinSymbol: "btc", buyPrice: 64200, amount: 0.12, kayitId: 1 },
  { username: "admin", coinId: "ethereum", coinSymbol: "eth", buyPrice: 3150, amount: 1.8, kayitId: 2 },
  { username: "admin", coinId: "gram-altin", coinSymbol: "GRAM", buyPrice: 2910, amount: 8, kayitId: 3 },
  { username: "ogrenci", coinId: "solana", coinSymbol: "sol", buyPrice: 142, amount: 12, kayitId: 4 },
];

let nextPortfolioId = 5;
let logCount = 18;

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.ORACLE_PASSWORD;
}

export function login(username: string, password: string) {
  return users.some((user) => user.username === username && user.password === password);
}

export function register(username: string, password: string) {
  if (!username || !password) {
    return { success: false, message: "Username and password are required." };
  }

  if (users.some((user) => user.username === username)) {
    return { success: false, message: "This username is already taken." };
  }

  users.push({ username, password, role: "user" });
  logCount += 1;
  return { success: true, message: "Account created. You can sign in now." };
}

export function listPortfolio(username: string) {
  return portfolio.filter((item) => item.username === username);
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

  logCount += 1;
}

export function sellAsset(username: string, coinId: string, amount: number) {
  const existing = portfolio.find((item) => item.username === username && item.coinId === coinId);

  if (!existing) {
    return { success: false, message: "This asset was not found in the portfolio." };
  }

  if (amount > existing.amount) {
    return { success: false, message: "Sale amount cannot exceed the portfolio amount." };
  }

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
