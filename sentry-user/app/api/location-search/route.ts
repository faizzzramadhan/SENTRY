import { NextRequest, NextResponse } from "next/server";

function normalize(q: string) {
  return q
    .toLowerCase()
    .replace(/\bjl\b\.?/g, "jalan")
    .replace(/\bjln\b\.?/g, "jalan")
    .replace(/\brigjend\b/g, "brigjen")
    .replace(/\briyadi\b/g, "riadi")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 1) {
      return NextResponse.json([]);
    }

    let query = normalize(q);

    // 🔥 custom fix untuk jalan terkenal
    if (query.includes("sigura")) {
      query = "jalan bendungan sigura gura malang";
    }

    const photonUrl =
      "https://photon.komoot.io/api/?" +
      `q=${encodeURIComponent(query)}` +
      "&limit=10" +
      "&lang=id" +
      "&lat=-7.9819" +
      "&lon=112.6265";

    const photonRes = await fetch(photonUrl, {
      cache: "no-store",
    });

    const photonData = await photonRes.json();

    let results: any[] = [];

    if (Array.isArray(photonData.features)) {
      results = photonData.features
        .map((f: any) => {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates || [];

          if (!coords[0] || !coords[1]) return null;

          return {
            display_name: [
              props.name,
              props.street,
              props.city,
              props.state,
            ]
              .filter(Boolean)
              .join(", "),
            lat: String(coords[1]),
            lon: String(coords[0]),
          };
        })
        .filter(Boolean);
    }

    // 🔥 fallback ke nominatim
    if (results.length === 0) {
      const nominatimUrl =
        "https://nominatim.openstreetmap.org/search?" +
        `q=${encodeURIComponent(query + ", Malang")}` +
        "&format=jsonv2&limit=10&countrycodes=id";

      const res = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "SENTRY",
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        results = data.map((item: any) => ({
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon,
        }));
      }
    }

    return NextResponse.json(results.slice(0, 10));
  } catch (err) {
    console.error(err);
    return NextResponse.json([]);
  }
}