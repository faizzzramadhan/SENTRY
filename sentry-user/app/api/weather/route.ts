import { NextResponse } from "next/server";

const MALANG = { lat: -7.983908, lon: 112.621391, name: "Kota Malang" }; // fokus Malang
const OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5";

function localDateKey(unixSeconds: number, tzOffsetSeconds: number) {
  // bikin key date berdasarkan timezone kota (forecast city.timezone)
  const ms = (unixSeconds + tzOffsetSeconds) * 1000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pickLabel(idx: number, dateIso: string) {
  if (idx === 0) return "Hari Ini";
  if (idx === 1) return "Besok";
  if (idx === 2) return "Lusa";
  // hari berikutnya: nama hari indonesia
  const d = new Date(dateIso + "T00:00:00");
  return new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(d);
}

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "OPENWEATHER_API_KEY belum di-set di .env.local" },
      { status: 500 }
    );
  }

  // Current weather endpoint: /data/2.5/weather?lat&lon&appid :contentReference[oaicite:4]{index=4}
  const currentUrl =
    `${OPENWEATHER_BASE}/weather?lat=${MALANG.lat}&lon=${MALANG.lon}` +
    `&appid=${apiKey}&units=metric&lang=id`;

  // Forecast endpoint: /data/2.5/forecast (5 hari / 3 jam) :contentReference[oaicite:5]{index=5}
  const forecastUrl =
    `${OPENWEATHER_BASE}/forecast?lat=${MALANG.lat}&lon=${MALANG.lon}` +
    `&appid=${apiKey}&units=metric&lang=id`;

  const [currentRes, forecastRes] = await Promise.all([
    fetch(currentUrl, { cache: "no-store" }),
    fetch(forecastUrl, { cache: "no-store" }),
  ]);

  if (!currentRes.ok) {
    const t = await currentRes.text();
    return NextResponse.json({ message: "Gagal ambil current weather", detail: t }, { status: 500 });
  }
  if (!forecastRes.ok) {
    const t = await forecastRes.text();
    return NextResponse.json({ message: "Gagal ambil forecast", detail: t }, { status: 500 });
  }

  const current = await currentRes.json();
  const forecast = await forecastRes.json();

  const tz = forecast?.city?.timezone ?? 0;

  // current summary
  const currentIcon = current.weather?.[0]?.icon ?? "01d";
  const currentDesc = current.weather?.[0]?.description ?? "-";
  const currentTemp = Math.round(current.main?.temp ?? 0);
  const humidity = current.main?.humidity ?? 0;
  const windMs = current.wind?.speed ?? 0;
  const windKmh = Math.round(windMs * 3.6);

  // group forecast into daily min/max
  const byDay: Record<
    string,
    { min: number; max: number; icon: string; desc: string; sampleHourDist: number }
  > = {};

  for (const item of forecast.list ?? []) {
    const dt = item.dt as number;
    const key = localDateKey(dt, tz);

    const tMin = item.main?.temp_min ?? item.main?.temp ?? 0;
    const tMax = item.main?.temp_max ?? item.main?.temp ?? 0;

    const icon = item.weather?.[0]?.icon ?? "01d";
    const desc = item.weather?.[0]?.description ?? "-";

    // pilih icon yang paling dekat jam 12 siang (buat representasi hari)
    const hourLocal = new Date((dt + tz) * 1000).getUTCHours();
    const dist = Math.abs(12 - hourLocal);

    if (!byDay[key]) {
      byDay[key] = { min: tMin, max: tMax, icon, desc, sampleHourDist: dist };
    } else {
      byDay[key].min = Math.min(byDay[key].min, tMin);
      byDay[key].max = Math.max(byDay[key].max, tMax);
      if (dist < byDay[key].sampleHourDist) {
        byDay[key].icon = icon;
        byDay[key].desc = desc;
        byDay[key].sampleHourDist = dist;
      }
    }
  }

  const keys = Object.keys(byDay).sort().slice(0, 5); // 5 hari (mirip desain kamu)
  const daily = keys.map((k, idx) => ({
    label: pickLabel(idx, k),
    dateIso: k,
    min: Math.round(byDay[k].min),
    max: Math.round(byDay[k].max),
    icon: byDay[k].icon,
    desc: byDay[k].desc,
  }));

  return NextResponse.json({
    city: MALANG.name,
    current: {
      temp: currentTemp,
      desc: currentDesc,
      icon: currentIcon,
      humidity,
      windKmh,
    },
    daily,
  });
}