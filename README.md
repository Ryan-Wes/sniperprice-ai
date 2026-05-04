# 🧠 SniperPrice AI

O SniperPrice AI é um sistema fullstack criado para ajudar o usuário a
decidir o melhor momento de compra com base no comportamento de preços
ao longo do tempo.

Diferente de um simples rastreador, o sistema analisa tendências,
identifica oportunidades e gera recomendações inteligentes.

------------------------------------------------------------------------

## 🚀 Funcionalidades

-   Cadastro e gerenciamento de produtos (CRUD)
-   Histórico de preços
-   Visualização com gráficos dinâmicos
-   Análise inteligente de compra (preço alvo, tendência, mínimo)
-   Recomendação automática (Comprar / Observar)
-   Integração com n8n para automação de preços
-   Interface interativa e responsiva

------------------------------------------------------------------------

## ⚙️ Tecnologias

### Frontend

-   React
-   Recharts

### Backend

-   FastAPI
-   SQLite

### Automação

-   n8n (via webhook)

------------------------------------------------------------------------

## ⚡ Como funciona

1.  O usuário cadastra um produto com preço alvo\
2.  O sistema armazena atualizações de preço ao longo do tempo\
3.  O n8n dispara atualizações automáticas via webhook\
4.  O backend salva o histórico e recalcula o status\
5.  O frontend exibe análise e recomendação em tempo real

------------------------------------------------------------------------

## 🧠 Objetivo do projeto

Simular um sistema real de monitoramento de preços com foco em tomada de
decisão, incluindo automação e análise de dados.

A arquitetura já está preparada para integração futura com fontes reais
(APIs ou scraping).

------------------------------------------------------------------------

## 🔮 Melhorias futuras

-   Integração com scraping de e-commerces
-   Sistema de notificações (queda de preço)
-   Suporte a múltiplos usuários
-   Deploy em produção

------------------------------------------------------------------------

## 🎯 Conceito principal

Este não é apenas um rastreador de preços.

É um sistema de decisão de compra.
