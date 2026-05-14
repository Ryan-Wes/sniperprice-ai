import httpx
import re
import json
import os
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

ML_CLIENT_ID = os.getenv("ML_CLIENT_ID")
ML_CLIENT_SECRET = os.getenv("ML_CLIENT_SECRET")
ML_ACCESS_TOKEN = os.getenv("ML_ACCESS_TOKEN")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

_ml_token_cache = {"token": None, "expires_at": 0}


async def _get_ml_token() -> str | None:
    """Retorna o access token do ML. Prioriza o token de usuário do .env."""
    import time

    # Prioridade 1: token de usuário (Authorization Code)
    if ML_ACCESS_TOKEN:
        return ML_ACCESS_TOKEN

    # Prioridade 2: client_credentials (acesso limitado)
    if _ml_token_cache["token"] and time.time() < _ml_token_cache["expires_at"]:
        return _ml_token_cache["token"]

    if not ML_CLIENT_ID or not ML_CLIENT_SECRET:
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                "https://api.mercadolibre.com/oauth/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": ML_CLIENT_ID,
                    "client_secret": ML_CLIENT_SECRET,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if r.status_code == 200:
                data = r.json()
                token = data.get("access_token")
                expires_in = data.get("expires_in", 21600)
                _ml_token_cache["token"] = token
                _ml_token_cache["expires_at"] = time.time() + expires_in - 60
                return token
    except Exception:
        pass
    return None


def _extrair_id_ml(url: str):
    # Prioridade 1: item_id explícito
    item_param = re.search(r"item_id[:%3A]+(MLB\d+)", url)
    if item_param:
        return ("item", item_param.group(1))

    # Prioridade 2: item no path
    item_path = re.search(r"/(MLB\d+)(?:[/-]|$)", url)
    if item_path:
        return ("item", item_path.group(1))

    # Prioridade 3: produto /p/
    produto = re.search(r"/p/(MLB\d+)", url)
    if produto:
        return ("product", produto.group(1))

    return None


async def _buscar_preco_ml(url: str) -> float | None:
    token = await _get_ml_token()
    if not token:
        return None

    headers_auth = {"Authorization": f"Bearer {token}"}
    id_info = _extrair_id_ml(url)
    if not id_info:
        return None

    tipo, mlb_id = id_info

    async with httpx.AsyncClient(timeout=15) as client:
        if tipo == "item":
            r = await client.get(
                f"https://api.mercadolibre.com/items/{mlb_id}",
                headers=headers_auth
            )
            if r.status_code == 200:
                data = r.json()
                price = data.get("price") or data.get("sale_price")
                if price:
                    return float(price)

        # Para produto ou fallback
        produto_match = re.search(r"/p/(MLB\d+)", url)
        if produto_match:
            mlb_product = produto_match.group(1)
            r = await client.get(
                f"https://api.mercadolibre.com/products/{mlb_product}",
                headers=headers_auth
            )
            if r.status_code == 200:
                data = r.json()
                bwinner = data.get("buy_box_winner") or {}
                price = bwinner.get("price")
                if price:
                    return float(price)

    return None


# ── Scraping HTML genérico ────────────────────────────

SELETORES_CSS = [
    ".andes-money-amount__fraction",
    ".price-tag-fraction",
    ".a-price-whole",
    ".a-offscreen",
    "[itemprop='price']",
    "[class*='price']",
    "[class*='preco']",
    "[class*='valor']",
    "[id*='price']",
    "[id*='preco']",
]


def _limpar_preco(texto: str) -> float | None:
    if not texto:
        return None
    numeros = re.sub(r"[^\d.,]", "", str(texto).strip())
    if not numeros:
        return None
    if "," in numeros and "." in numeros:
        numeros = numeros.replace(".", "").replace(",", ".")
    elif "," in numeros:
        numeros = numeros.replace(",", ".")
    try:
        valor = float(numeros)
        if 0 < valor < 1_000_000:
            return valor
    except ValueError:
        pass
    return None


def _extrair_via_json_ld(soup: BeautifulSoup) -> float | None:
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            if not script.string:
                continue
            data = json.loads(script.string)
            itens = data if isinstance(data, list) else [data]
            for item in itens:
                offers = item.get("offers", {})
                if isinstance(offers, list):
                    offers = offers[0] if offers else {}
                preco = offers.get("price") or offers.get("lowPrice")
                if preco:
                    valor = _limpar_preco(str(preco))
                    if valor:
                        return valor
        except Exception:
            continue
    return None


def _extrair_via_css(soup: BeautifulSoup) -> float | None:
    for seletor in SELETORES_CSS:
        try:
            for el in soup.select(seletor):
                conteudo = el.get("content") or el.get("data-price")
                if conteudo:
                    preco = _limpar_preco(str(conteudo))
                    if preco:
                        return preco
                preco = _limpar_preco(el.get_text())
                if preco:
                    return preco
        except Exception:
            continue
    return None


def _extrair_preco_html(html: str) -> float | None:
    soup = BeautifulSoup(html, "html.parser")
    return _extrair_via_json_ld(soup) or _extrair_via_css(soup)


async def buscar_preco(url: str) -> float | None:
    # Mercado Livre: usa API oficial com token
    if "mercadolivre.com" in url or "mercadolibre.com" in url:
        preco = await _buscar_preco_ml(url)
        if preco:
            return preco

    # Outros sites: scraping HTML
    try:
        async with httpx.AsyncClient(
            headers=HEADERS,
            follow_redirects=True,
            timeout=20,
        ) as client:
            response = await client.get(url)
            if response.status_code == 200:
                return _extrair_preco_html(response.text)
    except Exception:
        pass

    return None
