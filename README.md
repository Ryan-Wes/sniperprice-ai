# 🧠 SniperPrice AI

SniperPrice AI is a fullstack system that helps users decide the best time to buy a product based on real price behavior over time.

More than a simple price tracker — it analyzes trends, identifies opportunities and generates intelligent buy recommendations.

---

## 🚀 Features

- Product registration and management (CRUD)
- **Real price scraping** from e-commerce URLs (Kabum, Amazon, and others)
- **Mercado Livre integration** via official OAuth 2.0 API
- Price history with dynamic charts
- Intelligent buy analysis (target price, trend, historical minimum)
- Automatic recommendation: **Buy Now / Watch**
- **Automated price updates** via n8n scheduled workflows
- Responsive and interactive interface

---

## ⚙️ Tech Stack

### Frontend
- React
- Recharts

### Backend
- FastAPI
- SQLite
- httpx + BeautifulSoup4 (scraping)

### Automation
- n8n (scheduled price update workflow)

---

## ⚡ How it works

1. User registers a product with a target price and the product URL
2. Clicking **"Buscar preços reais"** triggers real scraping of the product page
3. The backend extracts the price via HTML parsing or ML's official API (OAuth)
4. The price history is saved and the status is recalculated
5. The frontend displays the analysis and recommendation in real time
6. An **n8n workflow** runs on a schedule, automatically scraping all products and keeping prices up to date

---

## 🔌 Price extraction strategy

| Source | Method |
|---|---|
| Mercado Livre | Official API with OAuth 2.0 (Authorization Code + Client Credentials) |
| Kabum, Amazon, others | HTML scraping with JSON-LD, meta tags and CSS selectors |

---

## 🤖 Automation (n8n)

A scheduled n8n workflow hits `POST /api/products/scrape-all` at regular intervals, triggering real price scraping for all registered products automatically — no manual action needed.

The workflow includes retry logic to handle cold starts from the free-tier backend hosting.

---

## 🛠️ Local setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Create a `.env` in `backend/`:

```
ML_CLIENT_ID=your_ml_app_id
ML_CLIENT_SECRET=your_ml_secret
ML_ACCESS_TOKEN=your_ml_user_token
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Deploy

- **Backend**: hosted on [Render](https://render.com)
- **Frontend**: hosted on [Vercel](https://vercel.com)

---

## 🎯 Core concept

This is not just a price tracker.

It's a **purchase decision system**.
