"use client";

import { BankOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Typography, message } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const { Text, Title } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("currentUser", values.username);
        message.success(data.message);
        router.push("/dashboard");
      } else {
        message.error(data.message);
      }
    } catch {
      message.error("Sunucuya ulaşılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Text style={{ color: "#93c5fd", fontWeight: 700, letterSpacing: 0 }}>Finance Tracking System</Text>
        <h1>Crypto and precious metals portfolio control center.</h1>
        <p>
          Track real-time market prices, portfolio cost basis, profit/loss, database-backed transaction logs and
          asset allocation from one focused dashboard.
        </p>

        <div className="auth-metrics">
          <div className="auth-metric">
            <strong>Oracle</strong>
            <span>PL/SQL procedures, views and triggers</span>
          </div>
          <div className="auth-metric">
            <strong>Next.js</strong>
            <span>Full-stack API routes and dashboard UI</span>
          </div>
          <div className="auth-metric">
            <strong>Demo</strong>
            <span>Works without local database setup</span>
          </div>
        </div>
      </section>

      <section className="auth-form-wrap">
        <Card className="auth-card" variant="borderless">
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <BankOutlined style={{ color: "#2563eb", fontSize: 32 }} />
            <Title level={3} style={{ marginBottom: 4, marginTop: 14 }}>
              Giriş Yap
            </Title>
            <Text type="secondary">Demo hesap: admin / 123456</Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item name="username" rules={[{ required: true, message: "Kullanıcı adı girin." }]}>
              <Input prefix={<UserOutlined />} placeholder="Kullanıcı adı" />
            </Form.Item>

            <Form.Item name="password" rules={[{ required: true, message: "Şifre girin." }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Şifre" />
            </Form.Item>

            <Button block htmlType="submit" loading={loading} type="primary">
              Dashboard&apos;a Git
            </Button>
          </Form>

          <div style={{ color: "#64748b", marginTop: 18, textAlign: "center" }}>
            Hesabın yok mu?{" "}
            <Link href="/register" style={{ color: "#2563eb", fontWeight: 700 }}>
              Yeni hesap oluştur
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}
