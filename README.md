# 🧠 SniperPrice AI

SniperPrice AI is a fullstack system designed to help users decide the
best moment to buy a product based on price behavior and historical
analysis.

Instead of just tracking prices, the system analyzes trends, detects
opportunities, and provides recommendations.

------------------------------------------------------------------------

## 🚀 Features

-   Product tracking (CRUD)
-   Price history visualization
-   Smart deal analysis (target, trend, lowest price)
-   Real-time decision suggestions
-   Integration with n8n for automated price updates
-   Interactive UI with dynamic charts

------------------------------------------------------------------------

## ⚙️ Tech Stack

### Frontend

-   React
-   Recharts

### Backend

-   FastAPI
-   SQLite

### Automation

-   n8n (webhook-based price updates)

------------------------------------------------------------------------

## ⚡ How it works

1.  User registers a product with a target price\
2.  The system stores price updates over time\
3.  n8n triggers automated price updates via webhook\
4.  Backend saves history and recalculates deal status\
5.  Frontend displays analysis and recommendation

------------------------------------------------------------------------

## 🧠 Project Goal

The goal of this project is to simulate a real-world price monitoring
system with decision-making logic and automation pipelines, serving as a
foundation for future integrations with real data sources (APIs or web
scraping).

------------------------------------------------------------------------

## 🔮 Future Improvements

-   Real price scraping from e-commerce websites
-   Notification system (alerts when price drops)
-   Multi-user support
-   Deployment in production environment

------------------------------------------------------------------------

## 🎯 Key Concept

This is not just a price tracker.

It is a decision-making system.
