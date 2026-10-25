"""Menyusun data dashboard dari hasil notebook EduGap-XAI.

Pemakaian:
    python3 scripts/build_data.py path/ke/EduGap_XAI_outputs.zip
    python3 scripts/build_data.py path/ke/folder/EduGap_XAI_outputs

Hasil:
    public/data/edugap.json                 seluruh angka yang dibaca dashboard
    public/data/indonesia_provinces.geojson batas 38 provinsi dengan kunci nama yang cocok
    public/data/manifest.json               daftar gambar dan tabel yang bisa diunduh
    public/figures/...                      gambar PNG dari notebook
    public/downloads/...                    tabel CSV, dataset, zip hasil lengkap, dan notebook
                                            (notebook diambil dari folder notebook/ di akar proyek)
"""
import csv
import json
import shutil
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

GEO_NAME_FIX = {
    "Kepulauan Bangka Belitung": "KEP. BANGKA BELITUNG",
    "Kepulauan Riau": "KEP. RIAU",
    "Daerah Istimewa Yogyakarta": "DI YOGYAKARTA",
}
DISPLAY_FIX = {"DI YOGYAKARTA": "DI Yogyakarta", "DKI JAKARTA": "DKI Jakarta", "KEP. RIAU": "Kepulauan Riau",
               "KEP. BANGKA BELITUNG": "Kepulauan Bangka Belitung"}
DOB_PARENT = {"PAPUA BARAT DAYA": "PAPUA BARAT", "PAPUA SELATAN": "PAPUA", "PAPUA TENGAH": "PAPUA",
              "PAPUA PEGUNUNGAN": "PAPUA"}
PANEL_COLS = ["provinsi", "tahun", "aps_7_12", "aps_13_15", "aps_16_18", "aps_19_23", "miskin", "listrik",
              "air_minum_layak", "rls", "hls", "ipm", "pdrb_kapita", "pengeluaran_makanan", "tpt", "tpak", "ikp", "pou"]


def locate(source):
    path = Path(source).resolve()
    if path.suffix == ".zip":
        tmp = Path(tempfile.mkdtemp())
        with zipfile.ZipFile(path) as archive:
            archive.extractall(tmp)
        hits = list(tmp.rglob("web_data"))
        if not hits:
            sys.exit(f"Folder web_data tidak ditemukan di dalam {path.name}")
        return hits[0].parent, path
    if (path / "web_data").exists():
        return path, None
    hits = list(path.rglob("web_data"))
    if not hits:
        sys.exit(f"Folder web_data tidak ditemukan di {path}")
    return hits[0].parent, None


def load_json(base, name):
    with open(base / "web_data" / name, encoding="utf-8") as handle:
        return json.load(handle)


def number(value):
    if value in ("", None):
        return None
    if value in ("True", "False"):
        return value == "True"
    try:
        out = float(value)
    except ValueError:
        return value
    return int(out) if out.is_integer() and "." not in str(value) else out


def read_csv(base, rel):
    with open(base / "tables" / rel, encoding="utf-8") as handle:
        return [{k: number(v) for k, v in row.items()} for row in csv.DictReader(handle)]


def title_name(name):
    if name in DISPLAY_FIX:
        return DISPLAY_FIX[name]
    return " ".join(part.capitalize() for part in name.split())


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    base, zip_path = locate(sys.argv[1])

    summary = load_json(base, "summary.json")
    provinces = load_json(base, "provinces.json")
    panel = load_json(base, "panel.json")
    lisa = load_json(base, "lisa.json")
    moran = load_json(base, "moran.json")
    rules = load_json(base, "rules.json")
    forecast = load_json(base, "forecast.json")
    shap = load_json(base, "shap.json")
    tri = load_json(base, "triangulation.json")

    for prov in provinces:
        prov["nama"] = title_name(prov["provinsi"])
        prov["induk"] = DOB_PARENT.get(prov["provinsi"])

    years = sorted({row["tahun"] for row in panel})
    trend = []
    for year in years:
        rows = [r for r in panel if r["tahun"] == year]
        trend.append({"tahun": year, "n": len(rows),
                      **{c: sum(r[c] for r in rows) / len(rows)
                         for c in ["aps_7_12", "aps_13_15", "aps_16_18", "aps_19_23"]}})

    dob_rows = read_csv(base, "01_eda_raw/deteksi_salinan_dob.csv")
    impute_rows = []
    log_path = base / "data" / "log_imputasi.csv"
    if log_path.exists():
        with open(log_path, encoding="utf-8") as handle:
            impute_rows = list(csv.DictReader(handle))
    neighbors = read_csv(base, "03_spatial/daftar_tetangga_knn_2025.csv")

    data = {
        "meta": {"dibuat": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "tahun": years,
                 "jumlah_baris_panel": len(panel), "sel_imputasi": len(impute_rows),
                 "baris_salinan_dob": sum(1 for r in dob_rows if r["aps_identik_dengan_induk"] is True)},
        "summary": summary,
        "provinces": provinces,
        "panel": [{c: r.get(c) for c in PANEL_COLS} for r in panel],
        "trend": trend,
        "disparity": read_csv(base, "02_eda_clean/metrik_kesenjangan.csv"),
        "moran": moran,
        "lisa": [{k: r[k] for k in ["provinsi", "tahun", "aps_16_18", "w_aps_16_18", "local_I", "regime", "p_sim",
                                    "q_fdr", "sig_005", "sig_fdr", "cluster"]} for r in lisa],
        "bvLisa": read_csv(base, "03_spatial/bivariate_lisa_2025.csv"),
        "neighbors": {r["provinsi"]: r["tetangga_knn"] for r in neighbors},
        "neighborKm": {r["provinsi"]: r["jarak_rata2_tetangga_km"] for r in neighbors},
        "rules": {
            "aturan": rules["aturan"],
            "dinamika": rules["dinamika"],
            "keanggotaan": rules["keanggotaan"],
            "markov": rules["spatial_markov"],
            "uji_lr": rules["uji_lr"],
            "perbandingan": read_csv(base, "04_pattern/perbandingan_aturan_spasial_vs_internal.csv"),
            "kandidat": read_csv(base, "04_pattern/semua_kandidat_aturan.csv"),
        },
        "forecast": {
            "leaderboard": forecast["leaderboard"],
            "per_fold": forecast["per_fold"],
            "proyeksi": forecast["proyeksi"],
            "uji_cakupan": forecast["uji_cakupan"],
            "model_final": forecast["model_final"],
            "mae_per_fold": read_csv(base, "05_forecast/mae_per_fold_model_final.csv"),
            "elasticnet": read_csv(base, "05_forecast/diagnostik_elasticnet.csv"),
        },
        "shap": {
            "global": shap["global"],
            "full": read_csv(base, "06_xai/shap_kepentingan_varian_full.csv"),
            "lokal_2026": shap["lokal_2026"],
            "base_value": shap["base_value"],
            "horizon": shap["perbandingan_horizon"],
            "skenario": shap["skenario"],
            "per_fold": read_csv(base, "06_xai/shap_kepentingan_per_fold.csv"),
        },
        "tri": {
            "rows": tri,
            "kappa": read_csv(base, "07_triangulation/kappa_sinyal.csv"),
            "agree": read_csv(base, "07_triangulation/kesepakatan_sinyal.csv"),
            "tipologi": read_csv(base, "07_triangulation/ringkasan_tipologi.csv"),
            "bobot": read_csv(base, "07_triangulation/sensitivitas_bobot_ipi.csv"),
        },
    }
    (PUBLIC / "data").mkdir(parents=True, exist_ok=True)
    with open(PUBLIC / "data" / "edugap.json", "w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, separators=(",", ":"))

    geo_path = PUBLIC / "data" / "indonesia_provinces.geojson"
    with open(geo_path, encoding="utf-8") as handle:
        geo = json.load(handle)
    known = {p["provinsi"] for p in provinces}
    for feature in geo["features"]:
        name = feature["properties"].get("PROVINSI", "")
        key = GEO_NAME_FIX.get(name, name.upper())
        if key not in known:
            sys.exit(f"Nama provinsi GeoJSON tidak cocok dengan data: {name}")
        feature["properties"]["provinsi"] = key
    with open(geo_path, "w", encoding="utf-8") as handle:
        json.dump(geo, handle, ensure_ascii=False, separators=(",", ":"))

    for folder in ["figures", "downloads"]:
        shutil.rmtree(PUBLIC / folder, ignore_errors=True)
    shutil.copytree(base / "figures", PUBLIC / "figures")
    shutil.copytree(base / "tables", PUBLIC / "downloads" / "tables")
    shutil.copytree(base / "data", PUBLIC / "downloads" / "data")
    manifest = {"figures": sorted(p.relative_to(PUBLIC).as_posix() for p in (PUBLIC / "figures").rglob("*.png")),
                "tables": sorted(p.relative_to(PUBLIC).as_posix() for p in (PUBLIC / "downloads").rglob("*.csv"))}
    if zip_path:
        shutil.copy(zip_path, PUBLIC / "downloads" / "EduGap_XAI_outputs.zip")
        manifest["zip"] = "downloads/EduGap_XAI_outputs.zip"
    notebooks = sorted((ROOT / "notebook").glob("*.ipynb"))
    if notebooks:
        (PUBLIC / "downloads" / "notebook").mkdir(parents=True, exist_ok=True)
        for nb in notebooks:
            shutil.copy(nb, PUBLIC / "downloads" / "notebook" / nb.name)
        manifest["notebook"] = [f"downloads/notebook/{nb.name}" for nb in notebooks]
    with open(PUBLIC / "data" / "manifest.json", "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=1)
    size = (PUBLIC / "data" / "edugap.json").stat().st_size / 1024
    print(f"edugap.json {size:.0f} KB, {len(manifest['figures'])} gambar, {len(manifest['tables'])} tabel")


if __name__ == "__main__":
    main()
