"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BankOutlined,
  BarChartOutlined,
  GoldOutlined,
  HistoryOutlined,
  LogoutOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Col,
  ConfigProvider,
  InputNumber,
  Modal,
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
  profit: number;
  profitPercent: number;
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
  const [logCount, setLogCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState("");
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

      return { ...item, currentValue, live, profit, profitPercent };
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

  const trendData = useMemo(() => {
    const base = totals.currentValue || 10000;
    return Array.from({ length: 8 }, (_, index) => {
      const drift = 1 + (index - 3) * 0.012;
      const wave = Math.sin(index * 1.3) * 0.025;
      return {
        date: `${index + 1}. gün`,
        value: Math.round(base * (drift + wave)),
      };
    });
  }, [totals.currentValue]);

  const insights = useMemo(() => {
    const top = allocationData[0];
    const profitLabel = totals.profit >= 0 ? "pozitif" : "negatif";
    return [
      top ? `En yüksek ağırlık ${top.name} varlığında: %${top.weight.toFixed(1)}.` : "Portföy henüz boş.",
      `Güncel portföy getirisi ${profitLabel}: %${totals.profitPercent.toFixed(2)}.`,
      totals.riskScore > 70
        ? "Risk skoru yüksek. Tek varlık yoğunlaşmasını azaltmak mantıklı olabilir."
        : "Risk skoru kontrollü seviyede görünüyor.",
    ];
  }, [allocationData, totals.profit, totals.profitPercent, totals.riskScore]);

  const fetchData = useCallback(async (username: string) => {
    setRefreshing(true);

    try {
      const [cryptoRes, goldRes, portfolioRes, statsRes] = await Promise.all([
        fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false"),
        fetch("/api/market/gold"),
        fetch("/api/portfolio/list", {
          body: JSON.stringify({ username }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
        fetch("/api/stats"),
      ]);

      const crypto = cryptoRes.ok ? await cryptoRes.json() : fallbackCrypto;
      const gold = await goldRes.json();
      const portfolioPayload = await portfolioRes.json();
      const statsPayload = await statsRes.json();

      setCryptoData(Array.isArray(crypto) && crypto.length ? crypto : fallbackCrypto);
      setGoldData(gold);
      setPortfolio(portfolioPayload.success ? portfolioPayload.data : []);
      setLogCount(statsPayload.logs ?? 0);
    } catch (error) {
      console.error("Data fetch error:", error);
      setCryptoData(fallbackCrypto);
      messageApi.warning("Canlı piyasa verisi alınamadı, demo fiyatlar gösteriliyor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [messageApi]);

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");

    if (!storedUser) {
      router.push("/");
      return;
    }

    setUser(storedUser);
    fetchData(storedUser);
  }, [fetchData, router]);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
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
        username: user,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      messageApi.success(data.message ?? "Varlık eklendi.");
      setIsAddOpen(false);
      fetchData(user);
    } else {
      messageApi.error(data.message ?? "İşlem başarısız.");
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
      body: JSON.stringify({ amount: amountInput, coinId: asset.coinId, username: user }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const data = await response.json();

    if (data.success) {
      messageApi.success(data.message ?? "Satış tamamlandı.");
      setIsSellOpen(false);
      fetchData(user);
    } else {
      messageApi.error(data.message ?? "Satış başarısız.");
    }
  };

  const marketColumns: ColumnsType<MarketAsset> = [
    {
      dataIndex: "name",
      title: "Varlık",
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
      title: "Fiyat",
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
      title: "İşlem",
      width: 120,
      render: (_, record) => (
        <Button icon={<PlusCircleOutlined />} onClick={() => openAddModal(record)} size="small" type="primary">
          Ekle
        </Button>
      ),
    },
  ];

  const portfolioColumns: ColumnsType<PortfolioRow> = [
    {
      title: "Varlık",
      render: (_, record) => (
        <Space>
          <Avatar src={record.live?.image} size="small">
            {record.coinSymbol.slice(0, 1).toUpperCase()}
          </Avatar>
          <Text strong>{record.coinSymbol.toUpperCase()}</Text>
        </Space>
      ),
    },
    { dataIndex: "amount", title: "Miktar", render: (value: number) => number(value) },
    { dataIndex: "buyPrice", title: "Maliyet", render: (value: number) => currency(value) },
    { dataIndex: "currentValue", title: "Değer", render: (value: number) => <Text strong>{currency(value)}</Text> },
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
          Sat
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
              <div className="dashboard-subtitle">Kullanıcı: {user} · demo ve Oracle modları aynı arayüzü kullanır</div>
            </div>
            <Space wrap>
              <Button icon={<ReloadOutlined />} loading={refreshing} onClick={() => fetchData(user)}>
                Yenile
              </Button>
              <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
                Çıkış
              </Button>
            </Space>
          </header>

          <section className="metric-grid">
            <Card className="metric-card" variant="borderless">
              <Statistic prefix={<WalletOutlined />} precision={2} suffix="$" title="Toplam Maliyet" value={totals.totalCost} />
            </Card>
            <Card className="metric-card" variant="borderless">
              <Statistic
                prefix={<BankOutlined />}
                precision={2}
                suffix="$"
                title="Güncel Değer"
                value={totals.currentValue}
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
            <Card className="metric-card" variant="borderless">
              <Statistic
                prefix={totals.profit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                precision={2}
                suffix="$"
                title="Net Kar / Zarar"
                value={totals.profit}
                valueStyle={{ color: totals.profit >= 0 ? "#16a34a" : "#dc2626" }}
              />
            </Card>
            <Card className="metric-card" variant="borderless">
              <Statistic
                prefix={<SafetyCertificateOutlined />}
                suffix="/ 100"
                title="Risk Skoru"
                value={totals.riskScore}
                valueStyle={{ color: totals.riskScore > 70 ? "#dc2626" : "#0f766e" }}
              />
            </Card>
          </section>

          <section className="content-grid">
            <div>
              <Card
                title={
                  <Space>
                    <BarChartOutlined />
                    Piyasa ve Varlık Ekleme
                  </Space>
                }
                variant="borderless"
              >
                <Tabs
                  items={[
                    {
                      children: (
                        <Table columns={marketColumns} dataSource={cryptoData} pagination={false} rowKey="id" size="middle" />
                      ),
                      key: "crypto",
                      label: "Kripto",
                    },
                    {
                      children: (
                        <Table columns={marketColumns} dataSource={goldData} pagination={false} rowKey="id" size="middle" />
                      ),
                      key: "gold",
                      label: (
                        <Space>
                          <GoldOutlined />
                          Altın & Metal
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>

              <Card style={{ marginTop: 16 }} title="Portföyüm" variant="borderless">
                <Table
                  columns={portfolioColumns}
                  dataSource={portfolioRows}
                  pagination={false}
                  rowKey="kayitId"
                  scroll={{ x: true }}
                />
              </Card>
            </div>

            <aside className="side-grid">
              <Card title="Portföy Trendi" variant="borderless">
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

              <Card title="Varlık Dağılımı" variant="borderless">
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
                      <span>%{item.weight.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Operasyon Özeti" variant="borderless">
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Statistic prefix={<HistoryOutlined />} title="İşlem Logu" value={logCount} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Takip Edilen" value={portfolioRows.length} />
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
          okText="Portföye Ekle"
          onCancel={() => setIsAddOpen(false)}
          onOk={confirmAddAsset}
          open={isAddOpen}
          title={`${(selectedAsset as MarketAsset | null)?.name ?? "Varlık"} satın al`}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text type="secondary">Miktar</Text>
            <InputNumber min={0.01} onChange={setAmountInput} step={0.01} style={{ width: "100%" }} value={amountInput} />
            {selectedAsset && amountInput ? (
              <Text strong>Yaklaşık işlem tutarı: {currency(((selectedAsset as MarketAsset).current_price ?? 0) * amountInput)}</Text>
            ) : null}
          </Space>
        </Modal>

        <Modal
          okButtonProps={{ danger: true }}
          okText="Sat"
          onCancel={() => setIsSellOpen(false)}
          onOk={confirmSellAsset}
          open={isSellOpen}
          title={`${(selectedAsset as PortfolioRow | null)?.coinSymbol?.toUpperCase() ?? "Varlık"} sat`}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text type="secondary">Satış miktarı</Text>
            <InputNumber
              max={(selectedAsset as PortfolioRow | null)?.amount}
              min={0.01}
              onChange={setAmountInput}
              step={0.01}
              style={{ width: "100%" }}
              value={amountInput}
            />
            <Text type="secondary">Mevcut miktar: {number((selectedAsset as PortfolioRow | null)?.amount ?? 0)}</Text>
          </Space>
        </Modal>
      </main>
    </ConfigProvider>
  );
}
