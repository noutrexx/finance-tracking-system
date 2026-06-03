import { NextResponse } from "next/server";

export async function GET() {
  const randomChange = () => Number((Math.random() * 2 - 1).toFixed(2));

  return NextResponse.json([
    {
      id: "gram-altin",
      symbol: "GRAM",
      name: "Gram Gold",
      image: "https://img.icons8.com/color/48/gold-bars.png",
      current_price: 3050.45 + randomChange(),
      price_change_percentage_24h: 1.25,
    },
    {
      id: "ons-altin",
      symbol: "XAU",
      name: "Gold Ounce",
      image: "https://img.icons8.com/color/48/gold-ore.png",
      current_price: 2680.1 + randomChange(),
      price_change_percentage_24h: 0.45,
    },
    {
      id: "altin-s1",
      symbol: "ALTIN.S1",
      name: "Mint Gold Certificate",
      image: "https://img.icons8.com/fluency/48/certificate.png",
      current_price: 24.85 + Math.random() * 0.1,
      price_change_percentage_24h: 2.1,
    },
    {
      id: "gumus-gram",
      symbol: "GUMUS",
      name: "Silver Gram",
      image: "https://img.icons8.com/color/48/silver-bars.png",
      current_price: 34.2 + randomChange(),
      price_change_percentage_24h: -0.5,
    },
  ]);
}
