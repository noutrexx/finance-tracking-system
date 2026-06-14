import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "finance_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const PASSWORD_PREFIX = "scrypt";

type SessionPayload = {
  exp: number;
  username: string;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function parseCookies(header: string | null) {
  return Object.fromEntries(
    (header ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `${PASSWORD_PREFIX}$${salt}$${hash}`;
}

export function isPasswordHash(value: string) {
  return value.startsWith(`${PASSWORD_PREFIX}$`);
}

export function verifyPassword(password: string, storedValue: string) {
  if (!isPasswordHash(storedValue)) {
    return false;
  }

  const [, salt, expectedHash] = storedValue.split("$");

  if (!salt || !expectedHash) {
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "base64url");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSessionToken(username: string) {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    username,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function getSessionUsername(request: Request) {
  const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];

  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const actualSignature = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    actualSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(actualSignature, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    return payload.exp > Math.floor(Date.now() / 1000) && payload.username ? payload.username : null;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, username: string) {
  response.cookies.set(SESSION_COOKIE, createSessionToken(username), {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function unauthorizedResponse() {
  return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
}
