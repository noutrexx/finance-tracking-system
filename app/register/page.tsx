"use client";

import { LockOutlined, UserAddOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Typography, message } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const { Text, Title } = Typography;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        message.success(data.message);
        router.push("/");
      } else {
        message.error(data.message);
      }
    } catch {
      message.error("Server is not reachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Text style={{ color: "#93c5fd", fontWeight: 700, letterSpacing: 0 }}>Secure onboarding</Text>
        <h1>Create a portfolio workspace in seconds.</h1>
        <p>
          Create a portfolio workspace and connect it to the same API contract used by the dashboard.
        </p>
      </section>

      <section className="auth-form-wrap">
        <Card className="auth-card" variant="borderless">
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <UserAddOutlined style={{ color: "#16a34a", fontSize: 32 }} />
            <Title level={3} style={{ marginBottom: 4, marginTop: 14 }}>
              Create Account
            </Title>
            <Text type="secondary">Start tracking assets securely</Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item name="username" rules={[{ required: true, message: "Username is required." }]}>
              <Input prefix={<UserOutlined />} placeholder="Username" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: "Password is required." },
                { min: 8, message: "Password must contain at least 8 characters." },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Password" />
            </Form.Item>

            <Button block htmlType="submit" loading={loading} style={{ background: "#16a34a" }} type="primary">
              Create Account
            </Button>
          </Form>

          <div style={{ color: "#64748b", marginTop: 18, textAlign: "center" }}>
            Already have an account?{" "}
            <Link href="/" style={{ color: "#2563eb", fontWeight: 700 }}>
              Sign in
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}
