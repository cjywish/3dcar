from __future__ import annotations

import base64
import json
from pathlib import Path
import re

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).resolve().parent
DIST_INDEX = ROOT / "dist" / "index.html"
MANUAL_PDFS = {
    "real_3d_car_user_manual.pdf": ROOT / "dist" / "real_3d_car_user_manual.pdf",
    "real_3d_car_user_manual_en.pdf": ROOT / "dist" / "real_3d_car_user_manual_en.pdf",
}


def _inline_dist_page() -> str:
    if not DIST_INDEX.exists():
        return """
        <div style="font-family: sans-serif; padding: 2rem; color: #e8f4ff; background: #07111f; height: 100vh;">
          <h2>Neon Ridge Racer</h2>
          <p>The built frontend was not found. Run <code>npm run build</code> first.</p>
        </div>
        """

    html = DIST_INDEX.read_text(encoding="utf-8")

    css_match = re.search(r'<link[^>]+href="([^"]+\.css)"[^>]*>', html)
    js_match = re.search(r'<script[^>]+type="module"[^>]+src="([^"]+\.js)"[^>]*></script>', html)

    if css_match:
        css_path = ROOT / "dist" / css_match.group(1).lstrip("/")
        css_text = css_path.read_text(encoding="utf-8") if css_path.exists() else ""
        html = re.sub(
            r'<link[^>]+href="([^"]+\.css)"[^>]*>',
            lambda _match: f"<style>{css_text}</style>",
            html,
            count=1,
        )

    if js_match:
        js_path = ROOT / "dist" / js_match.group(1).lstrip("/")
        js_text = js_path.read_text(encoding="utf-8") if js_path.exists() else ""
        html = re.sub(
            r'<script[^>]+type="module"[^>]+src="([^"]+\.js)"[^>]*></script>',
            lambda _match: f"<script type=\"module\">{js_text}</script>",
            html,
            count=1,
        )

    html = re.sub(r'<meta name="viewport"[^>]*>', '<meta name="viewport" content="width=device-width, initial-scale=1.0">', html)
    html = re.sub(r'<script type="module" crossorigin>', '<script type="module">', html)

    manual_links = {}
    for file_name, manual_pdf in MANUAL_PDFS.items():
        if manual_pdf.exists():
            manual_data = base64.b64encode(manual_pdf.read_bytes()).decode("ascii")
            manual_href = f"data:application/pdf;base64,{manual_data}"
            manual_links[file_name] = manual_href
            html = html.replace(f'href="./{file_name}"', f'href="{manual_href}"')
            html = html.replace(f'href="/{file_name}"', f'href="{manual_href}"')

    if manual_links:
        manual_script = f"<script>window.REAL_3D_CAR_MANUALS = {json.dumps(manual_links)};</script>"
        html = html.replace("</head>", f"{manual_script}</head>", 1)

    return html


st.set_page_config(page_title="Neon Ridge Racer", layout="wide", initial_sidebar_state="collapsed")

st.markdown(
    """
    <style>
      #MainMenu { visibility: hidden; }
      footer { visibility: hidden; }
      header { visibility: hidden; }
      .block-container { padding: 0; max-width: 100%; }
    </style>
    """,
    unsafe_allow_html=True,
)

components.html(_inline_dist_page(), height=980, scrolling=False)
