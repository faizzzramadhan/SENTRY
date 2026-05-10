import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5555"
).replace(/\/$/, "");

export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get("limit") || "4";

    const response = await fetch(
      `${API_BASE_URL}/osint/data/public/x-unverified?limit=${encodeURIComponent(limit)}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Gagal mengambil data OSINT X",
        error: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}