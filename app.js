const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

// Ambil nama dari feature atau context berdasarkan tipe (urut prioritas)
function ambil(feature, tipeList) {
  const konteks = feature.context || [];
  for (const tipe of tipeList) {
    if ((feature.place_type || []).includes(tipe)) {
      return feature.text;
    }
    const ctx = konteks.find(
      (c) =>
        (c.id && String(c.id).startsWith(tipe + ".")) ||
        (c.place_type || []).includes(tipe) ||
        c.kind === tipe
    );
    if (ctx) return ctx.text || ctx.name || "-";
  }
  return "-";
}

app.get("/api/lokasi", async (req, res) => {
  const kota = (req.query.q || "jakarta").trim();

  const apiKey = "vWXPrudoV4tnwNqYPVkL";

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(kota)}.json`;

  try {
    const response = await axios.get(url, {
      params: { key: apiKey, language: "id", limit: 1 },
    });

    const data = response.data;

    if (!data.features || data.features.length === 0) {
      return res.status(404).json({ message: "Lokasi tidak ditemukan" });
    }

    const f = data.features[0];
    const [longitude, latitude] = f.geometry.coordinates;

    // Sementara: lihat isi asli dari MapTiler di terminal
    console.log(JSON.stringify(f, null, 2));

    // Cadangan: place_name berurutan dari kecil ke besar
    const bagian = (f.place_name || "").split(",").map((s) => s.trim());

    let negara = ambil(f, ["country"]);
    if (negara === "-" && bagian.length > 1) {
      negara = bagian[bagian.length - 1];
    }

    let provinsi = ambil(f, ["region"]);
    if (provinsi === "-" && bagian.length > 2) {
      provinsi = bagian[bagian.length - 2];
    }

    res.json({
      lokasi: f.place_name,
      negara: negara,
      provinsi: provinsi,
      kecamatan: ambil(f, [
        "joint_municipality",
        "municipal_district",
        "municipality",
        "locality",
        "neighbourhood",
      ]),
      longitude: longitude,
      latitude: latitude,
    });
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      message: "Gagal mengambil data dari MapTiler",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});