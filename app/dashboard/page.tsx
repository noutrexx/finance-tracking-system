"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  DownloadOutlined,
  GoldOutlined,
  HistoryOutlined,
  LogoutOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SwapOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  ConfigProvider,
  Empty,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const { Text } = Typography;
const { defaultAlgorithm } = theme;

type MarketAsset = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number;
  price_change_percentage_24h?: number;
};

type PortfolioItem = {
  username: string;
  coinId: string;
  coinSymbol: string;
  buyPrice: number;
  amount: number;
  kayitId: number;
};

type PortfolioRow = PortfolioItem & {
  live?: MarketAsset;
  currentValue: number;
  dailyMove: number;
  profit: number;
  profitPercent: number;
};

type TransactionItem = {
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

const fallbackCrypto: MarketAsset[] = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 67240, price_change_percentage_24h: 1.9 },
  { id: "ethereum", symbol: "eth", name: "Ethereum", current_price: 3460, price_change_percentage_24h: -0.8 },
  { id: "solana", symbol: "sol", name: "Solana", current_price: 158, price_change_percentage_24h: 2.4 },
  { id: "ripple", symbol: "xrp", name: "XRP", current_price: 0.62, price_change_percentage_24h: 0.5 },
  { id: "cardano", symbol: "ada", name: "Cardano", current_price: 0.46, price_change_percentage_24h: -1.1 },
];

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 2, style: "currency" }).format(value || 0);

const number = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 6, minimumFractionDigits: 0 }).format(value || 0);

export default function DashboardPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [cryptoData, setCryptoData] = useState<MarketAsset[]>([]);
  const [goldData, setGoldData] = useState<MarketAsset[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [logCount, setLogCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState("");
  const [marketSearch, setMarketSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | PortfolioRow | null>(null);
  const [amountInput, setAmountInput] = useState<number | null>(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);

  const router = useRouter();

  const allAssets = useMemo(() => [...cryptoData, ...goldData], [cryptoData, goldData]);

  const portfolioRows = useMemo<PortfolioRow[]>(() => {
    return portfolio.map((item) => {
      const live = allAssets.find((asset) => asset.id === item.coinId);
      const currentValue = (live?.current_price ?? item.buyPrice) * item.amount;
      const cost = item.buyPrice * item.amount;
      const profit = currentValue - cost;
      const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
      const dailyMove = ((live?.price_change_percentage_24h ?? 0) / 100) * currentValue;

      return { ...item, currentValue, dailyMove, live, profit, profitPercent };
    });
  }, [allAssets, portfolio]);

  const totals = useMemo(() => {
    const totalCost = portfolioRows.reduce((sum, item) => sum + item.buyPrice * item.amount, 0);
    const currentValue = portfolioRows.reduce((sum, item) => sum + item.currentValue, 0);
    const profit = currentValue - totalCost;
    const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const riskScore = Math.min(100, Math.round(38 + portfolioRows.length * 7 + Math.abs(profitPercent)));

    return { currentValue, profit, profitPercent, riskScore, totalCost };
  }, [portfolioRows]);

  const allocationData = useMemo(() => {
    return portfolioRows
      .map((item) => ({
        name: item.coinSymbol.toUpperCase(),
        value: item.currentValue,
        weight: totals.currentValue > 0 ? (item.currentValue / totals.currentValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [portfolioRows, totals.currentValue]);

  const filteredCryptoData = useMemo(() => {
    const query = marketSearch.trim().toLowerCase();

    if (!query) return cryptoData;

    return cryptoData.filter(
      (asset) =>
        asset.name.toLowerCase().includes(query) ||
        asset.symbol.toLowerCase().includes(query),
    );
  }, [cryptoData, marketSearch]);

  const filteredGoldData = useMemo(() => {
    const query = marketSearch.trim().toLowerCase();

    if (!query) return goldData;

    return goldData.filter(
      (asset) =>
        asset.name.toLowerCase().includes(query) ||
        asset.symbol.toLowerCase().includes(query),
    );
  }, [goldData, marketSearch]);

  const riskRadar = useMemo(() => {
    const concentration = Math.round(allocationData[0]?.weight ?? 0);
    const dailyExposure =
      totals.currentValue > 0
        ? Math.min(100, Math.round((portfolioRows.reduce((sum, item) => sum + Math.abs(item.dailyMove), 0) / totals.currentValue) * 1200))
        : 0;
    const diversification = Math.min(100, portfolioRows.length * 18);
    const drawdownBuffer = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, -totals.profitPercent) * 4)));

    return { concentration, dailyExposure, diversification, drawdownBuffer };
  }, [allocationData, portfolioRows, totals.currentValue, totals.profitPercent]);

  const rebalanceData = useMemo(() => {
    if (!portfolioRows.length || totals.currentValue <= 0) return [];

    const targetWeight = 100 / portfolioRows.length;

    return allocationData.map((item) => {
      const drift = item.weight - targetWeight;
      const targetValue = (targetWeight / 100) * totals.currentValue;

      return {
        action: Math.abs(drift) < 5 ? "Hold" : drift > 0 ? "Trim" : "Add",
        drift,
        name: item.name,
        targetValue,
        weight: item.weight,
      };
    });
  }, [allocationData, portfolioRows.length, totals.currentValue]);

  const stressData = useMemo(() => {
    return [-15, -7, 7, 15].map((move) => ({
      label: `${move > 0 ? "+" : ""}${move}% market`,
      value: totals.currentValue * (1 + move / 100),
    }));
  }, [totals.currentValue]);

  const trendData = useMemo(() => {
    const base = totals.currentValue || 10000;
    return Array.from({ length: 8 }, (_, index) => {
      const drift = 1 + (index - 3) * 0.012;
      const wave = Math.sin(index * 1.3) * 0.025;
      return {
        date: `Day ${index + 1}`,
        value: Math.round(base * (drift + wave)),
      };
    });
  }, [totals.currentValue]);

  const insights = useMemo(() => {
    const top = allocationData[0];
    const profitLabel = totals.profit >= 0 ? "positive" : "negative";
    return [
      top ? `Largest allocation is ${top.name}: ${top.weight.toFixed(1)}%.` : "Portfolio is empty.",
      `Current portfolio return is ${profitLabel}: ${totals.profitPercent.toFixed(2)}%.`,
      totals.riskScore > 70
        ? "Risk score is elevated. Consider reducing single-asset concentration."
        : "Risk score is within a controlled range.",
    ];
  }, [allocationData, totals.profit, totals.profitPercent, totals.riskScore]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);

    try {
      const [cryptoRes, goldRes, portfolioRes, statsRes] = await Promise.all([
        fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false"),
        fetch("/api/market/gold"),
        fetch("/api/portfolio/list", {
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
        fetch("/api/stats"),
      ]);

      const crypto = cryptoRes.ok ? await cryptoRes.json() : fallbackCrypto;
      const gold = await goldRes.json();
      const portfolioPayload = await portfolioRes.json();
      const statsPayload = await statsRes.json();
      const transactionRes = await fetch("/api/transactions", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const transactionPayload = await transactionRes.json();

      setCryptoData(Array.isArray(crypto) && crypto.length ? crypto : fallbackCrypto);
      setGoldData(gold);
      setPortfolio(portfolioPayload.success ? portfolioPayload.data : []);
      setTransactions(transactionPayload.success ? transactionPayload.data : []);
      setLogCount(statsPayload.logs ?? 0);
    } catch (error) {
      console.error("Data fetch error:", error);
      setCryptoData(fallbackCrypto);
      messageApi.warning("Live market data is unavailable, showing fallback prices.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [messageApi]);

  useEffect(() => {
    const loadSession = async () => {
      const response = await fetch("/api/session");

      if (!response.ok) {
        router.push("/");
        return;
      }

      const session = await response.json();
      setUser(session.username);
      await fetchData();
    };

    loadSession();
  }, [fetchData, router]);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
  };

  const openAddModal = (asset: MarketAsset) => {
    setSelectedAsset(asset);
    setAmountInput(1);
    setIsAddOpen(true);
  };

  const confirmAddAsset = async () => {
    if (!selectedAsset || !amountInput || amountInput <= 0) {
      return;
    }

    const asset = selectedAsset as MarketAsset;
    const response = await fetch("/api/portfolio/add", {
      body: JSON.stringify({
        amount: amountInput,
        coinId: asset.id,
        coinSymbol: asset.symbol,
        price: asset.current_price,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      messageApi.success(data.message ?? "Asset added.");
      setIsAddOpen(false);
      fetchData();
    } else {
      messageApi.error(data.message ?? "Transaction failed.");
    }
  };

  const openSellModal = (asset: PortfolioRow) => {
    setSelectedAsset(asset);
    setAmountInput(Math.min(1, asset.amount));
    setIsSellOpen(true);
  };

  const confirmSellAsset = async () => {
    if (!selectedAsset || !amountInput || amountInput <= 0) {
      return;
    }

    const asset = selectedAsset as PortfolioRow;
    const response = await fetch("/api/portfolio/delete", {
      body: JSON.stringify({
        amount: amountInput,
        coinId: asset.coinId,
        price: asset.live?.current_price ?? asset.buyPrice,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      messageApi.success(data.message ?? "Sale completed.");
      setIsSellOpen(false);
      fetchData();
    } else {
      messageApi.error(data.message ?? "Sale failed.");
    }
  };

  const exportPortfolioCsv = () => {
    const header = ["Asset", "Amount", "Average Cost", "Current Value", "Profit", "Profit %"];
    const rows = portfolioRows.map((item) => [
      item.coinSymbol.toUpperCase(),
      item.amount,
      item.buyPrice,
      item.currentValue,
      item.profit,
      item.profitPercent,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${user || "portfolio"}-holdings.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const marketColumns: ColumnsType<MarketAsset> = [
    {
      dataIndex: "name",
      title: "Asset",
      render: (_, record) => (
        <Space>
          <Avatar src={record.image} size="small">
            {record.symbol.slice(0, 1).toUpperCase()}
          </Avatar>
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary">{record.symbol.toUpperCase()}</Text>
          </div>
        </Space>
      ),
    },
    {
      dataIndex: "current_price",
      title: "Price",
      render: (price: number) => <Text strong>{currency(price)}</Text>,
    },
    {
      dataIndex: "price_change_percentage_24h",
      title: "24s",
      render: (change: number) => (
        <Tag color={(change ?? 0) >= 0 ? "success" : "error"}>
          {(change ?? 0) >= 0 ? "+" : ""}
          {(change ?? 0).toFixed(2)}%
        </Tag>
      ),
    },
    {
      title: "Action",
      width: 120,
      render: (_, record) => (
        <Button icon={<PlusCircleOutlined />} onClick={() => openAddModal(record)} size="small" type="primary">
          Add
        </Button>
      ),
    },
  ];

  const portfolioColumns: ColumnsType<PortfolioRow> = [
    {
      title: "Asset",
      render: (_, record) => (
        <Space>
          <Avatar src={record.live?.image} size="small">
            {record.coinSymbol.slice(0, 1).toUpperCase()}
          </Avatar>
          <Text strong>{record.coinSymbol.toUpperCase()}</Text>
        </Space>
      ),
    },
    { dataIndex: "amount", title: "Amount", render: (value: number) => number(value) },
    { dataIndex: "buyPrice", title: "Cost", render: (value: number) => currency(value) },
    { dataIndex: "currentValue", title: "Value", render: (value: number) => <Text strong>{currency(value)}</Text> },
    {
      dataIndex: "profitPercent",
      title: "K/Z",
      render: (value: number) => (
        <Tag color={value >= 0 ? "success" : "error"}>
          {value >= 0 ? "+" : ""}
          {value.toFixed(2)}%
        </Tag>
      ),
    },
    {
      title: "",
      width: 90,
      render: (_, record) => (
        <Button danger icon={<MinusCircleOutlined />} onClick={() => openSellModal(record)} size="small">
          Sell
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-shell" style={{ display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ConfigProvider theme={{ algorithm: defaultAlgorithm, token: { borderRadius: 8, colorPrimary: "#2563eb" } }}>
      {contextHolder}
      <main className="dashboard-shell">
        <div className="dashboard-frame">
          <header className="dashboard-topbar">
            <div>
              <h1 className="dashboard-title">Portfolio Command Center</h1>
              <div className="dashboard-subtitle">Signed in as {user}</div>
            </div>
            <Space wrap>
              <Button disabled={!portfolioRows.length} icon={<DownloadOutlined />} onClick={exportPortfolioCsv}>
                Export CSV
              </Button>
              <Button icon={<ReloadOutlined />} loading={refreshing} onClick={() => fetchData()}>
                Refresh
              </Button>
              <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
                Sign Out
              </Button>
            </Space>
          </header>

          <section className="metric-grid">
            <Card className="metric-card" variant="borderless">
              <Statistic prefix={<WalletOutlined />} precision={2} suffix="$" title="Total Cost" value={totals.totalCost} />
            </Card>
            <Card className="metric-card" variant="borderless">
              <Statistic
                prefix={<BankOutlined />}
                precision={2}
                suffix="$"
                title="Current Value"
                value={totals.currentValue}
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
            <Card className="metric-card" variant="borderless">
              <Statistic
                prefix={totals.profit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                precision={2}
                suffix="$"
                title="Net Profit / Loss"
                value={totals.profit}
                valueStyle={{ color: totals.profit >= 0 ? "#16a34a" : "#dc2626" }}
              />
            </Card>
            <Card className="metric-card" variant="borderless">
              <Statistic
                prefix={<SafetyCertificateOutlined />}
                suffix="/ 100"
                title="Risk Score"
                value={totals.riskScore}
                valueStyle={{ color: totals.riskScore > 70 ? "#dc2626" : "#0f766e" }}
              />
            </Card>
          </section>

          <section className="content-grid">
            <div>
              <Card
                title={
                  <div className="card-title-row">
                    <Space>
                      <BarChartOutlined />
                      Market Watchlist
                    </Space>
                    <Input
                      allowClear
                      className="market-search"
                      onChange={(event) => setMarketSearch(event.target.value)}
                      placeholder="Search asset"
                      prefix={<SearchOutlined />}
                      value={marketSearch}
                    />
                  </div>
                }
                variant="borderless"
              >
                <Tabs
                  items={[
                    {
                      children: (
                        <Table columns={marketColumns} dataSource={filteredCryptoData} pagination={false} rowKey="id" size="middle" />
                      ),
                      key: "crypto",
                      label: "Crypto",
                    },
                    {
                      children: (
                        <Table columns={marketColumns} dataSource={filteredGoldData} pagination={false} rowKey="id" size="middle" />
                      ),
                      key: "gold",
                      label: (
                        <Space>
                          <GoldOutlined />
                          Metals
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>

              <Card style={{ marginTop: 16 }} title="My Portfolio" variant="borderless">
                <Table
                  columns={portfolioColumns}
                  dataSource={portfolioRows}
                  locale={{ emptyText: <Empty description="No holdings yet. Add an asset from the watchlist." /> }}
                  pagination={false}
                  rowKey="kayitId"
                  scroll={{ x: true }}
                />
              </Card>

              <Card
                style={{ marginTop: 16 }}
                title={
                  <Space>
                    <HistoryOutlined />
                    Transaction Journal
                  </Space>
                }
                variant="borderless"
              >
                <Table
                  columns={[
                    {
                      dataIndex: "createdAt",
                      title: "Date",
                      render: (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)),
                    },
                    {
                      dataIndex: "type",
                      title: "Type",
                      render: (value: TransactionItem["type"]) => <Tag color={value === "BUY" ? "blue" : "volcano"}>{value}</Tag>,
                    },
                    { dataIndex: "coinSymbol", title: "Asset", render: (value: string) => <Text strong>{value.toUpperCase()}</Text> },
                    { dataIndex: "amount", title: "Amount", render: (value: number) => number(value) },
                    { dataIndex: "total", title: "Total", render: (value: number) => currency(value) },
                  ]}
                  dataSource={transactions}
                  pagination={{ pageSize: 5 }}
                  rowKey="id"
                  size="middle"
                />
              </Card>
            </div>

            <aside className="side-grid">
              <Alert
                description={
                  totals.profit >= 0
                    ? "Portfolio is currently above cost basis. Review concentration before adding more exposure."
                    : "Portfolio is below cost basis. Use the rebalance view before averaging down."
                }
                message={totals.profit >= 0 ? "Positive portfolio posture" : "Defensive portfolio posture"}
                showIcon
                type={totals.profit >= 0 ? "success" : "warning"}
              />

              <Card title="Portfolio Trend" variant="borderless">
                <div style={{ height: 220 }}>
                  <ResponsiveContainer>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="portfolioValue" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid opacity={0.16} />
                      <XAxis dataKey="date" />
                      <YAxis hide domain={["auto", "auto"]} />
                      <Tooltip formatter={(value: number) => currency(value)} />
                      <Area dataKey="value" fill="url(#portfolioValue)" stroke="#2563eb" type="monotone" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card
                title={
                  <Space>
                    <AuditOutlined />
                    Risk Radar
                  </Space>
                }
                variant="borderless"
              >
                <div className="risk-radar">
                  <RiskMetric label="Concentration" percent={riskRadar.concentration} status={riskRadar.concentration > 45 ? "exception" : "normal"} />
                  <RiskMetric label="Daily exposure" percent={riskRadar.dailyExposure} status={riskRadar.dailyExposure > 35 ? "exception" : "normal"} />
                  <RiskMetric label="Diversification" percent={riskRadar.diversification} status="success" />
                  <RiskMetric label="Drawdown buffer" percent={riskRadar.drawdownBuffer} status={riskRadar.drawdownBuffer < 55 ? "exception" : "success"} />
                </div>
              </Card>

              <Card title="Asset Allocation" variant="borderless">
                <div style={{ height: 170 }}>
                  <ResponsiveContainer>
                    <BarChart data={allocationData} layout="vertical">
                      <XAxis hide type="number" />
                      <YAxis dataKey="name" type="category" width={70} />
                      <Tooltip formatter={(value: number) => currency(value)} />
                      <Bar dataKey="value" fill="#0f766e" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="allocation-list">
                  {allocationData.slice(0, 4).map((item) => (
                    <div className="allocation-row" key={item.name}>
                      <strong>{item.name}</strong>
                      <span className="allocation-bar">
                        <span className="allocation-fill" style={{ width: `${Math.min(item.weight, 100)}%` }} />
                      </span>
                      <span>{item.weight.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card
                title={
                  <Space>
                    <SwapOutlined />
                    Rebalance Plan
                  </Space>
                }
                variant="borderless"
              >
                <div className="rebalance-list">
                  {rebalanceData.map((item) => (
                    <div className="rebalance-row" key={item.name}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.weight.toFixed(1)}% current</span>
                      </div>
                      <Tag color={item.action === "Hold" ? "default" : item.action === "Trim" ? "volcano" : "blue"}>
                        {item.action}
                      </Tag>
                      <Text type="secondary">{currency(item.targetValue)}</Text>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Stress Scenarios" variant="borderless">
                <div className="stress-grid">
                  {stressData.map((item) => (
                    <div className="stress-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{currency(item.value)}</strong>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Operations Summary" variant="borderless">
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Statistic prefix={<HistoryOutlined />} title="Transaction Logs" value={logCount} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Tracked Assets" value={portfolioRows.length} />
                  </Col>
                </Row>
                <ul className="insight-list">
                  {insights.map((insight) => (
                    <li key={insight}>{insight}</li>
                  ))}
                </ul>
              </Card>
            </aside>
          </section>
        </div>

        <Modal
          okText="Add to Portfolio"
          onCancel={() => setIsAddOpen(false)}
          onOk={confirmAddAsset}
          open={isAddOpen}
          title={`Buy ${(selectedAsset as MarketAsset | null)?.name ?? "asset"}`}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text type="secondary">Amount</Text>
            <InputNumber min={0.01} onChange={setAmountInput} step={0.01} style={{ width: "100%" }} value={amountInput} />
            {selectedAsset && amountInput ? (
              <Text strong>Estimated transaction value: {currency(((selectedAsset as MarketAsset).current_price ?? 0) * amountInput)}</Text>
            ) : null}
          </Space>
        </Modal>

        <Modal
          okButtonProps={{ danger: true }}
          okText="Sell"
          onCancel={() => setIsSellOpen(false)}
          onOk={confirmSellAsset}
          open={isSellOpen}
          title={`Sell ${(selectedAsset as PortfolioRow | null)?.coinSymbol?.toUpperCase() ?? "asset"}`}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text type="secondary">Sale amount</Text>
            <InputNumber
              max={(selectedAsset as PortfolioRow | null)?.amount}
              min={0.01}
              onChange={setAmountInput}
              step={0.01}
              style={{ width: "100%" }}
              value={amountInput}
            />
            <Text type="secondary">Current amount: {number((selectedAsset as PortfolioRow | null)?.amount ?? 0)}</Text>
          </Space>
        </Modal>
      </main>
    </ConfigProvider>
  );
}

function RiskMetric({
  label,
  percent,
  status,
}: {
  label: string;
  percent: number;
  status: "success" | "normal" | "exception";
}) {
  return (
    <div>
      <div className="risk-label">
        <span>{label}</span>
        <strong>{percent}%</strong>
      </div>
      <Progress percent={percent} showInfo={false} status={status} />
    </div>
  );
}
