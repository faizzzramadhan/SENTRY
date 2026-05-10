import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5555"
).replace(/\/$/, "");

async function readJsonSafe(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return {
    message: "Response backend bukan JSON.",
    error: text.slice(0, 300),
  };
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          message: "osint_id tidak ditemukan pada URL.",
        },
        {
          status: 400,
        }
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/osint/data/public/x-verification/${encodeURIComponent(
        id
      )}`,
      {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await readJsonSafe(response);

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Gagal memproses verifikasi OSINT X",
        error: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}