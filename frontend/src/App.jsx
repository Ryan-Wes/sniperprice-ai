import { useEffect, useState } from "react"
import "./App.css"

import logoFull from "./assets/logo-full.png"
import logoIcon from "./assets/logo-icon.png"

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts"

function App() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/products/")
        const data = await res.json()

        const productsWithHistory = await Promise.all(
          data.map(async (product) => {
            try {
              const historyRes = await fetch(
                `http://127.0.0.1:8000/api/products/${product.id}/history`
              )
              const historyData = await historyRes.json()

              return {
                ...product,
                history: historyData,
              }
            } catch (err) {
              console.error("Erro ao buscar histórico:", err)
              return {
                ...product,
                history: [],
              }
            }
          })
        )

        setProducts(productsWithHistory)
      } catch (err) {
        console.error(err)
      }
    }

    loadProducts()
  }, [])

  return (
    <main>
      <section className="hero">
        <div className="hero-text">
          <div className="logo-title">
            <img src={logoIcon} alt="icon" className="logo-icon" />
            <img src={logoFull} alt="SniperPrice AI" className="logo-full" />
          </div>

          <p>
            Detecte oportunidades reais de compra com análise inteligente de
            preços, histórico e variações — sem cair em falsas promoções.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="products-grid">
          {products.map((product) => (
            <div className="product-card" key={product.id}>
              <h3>{product.name}</h3>

              <p className="store">{product.store}</p>

              <div className="prices">
                <span>Atual: R$ {product.current_price ?? "-"}</span>
                <span>Alvo: R$ {product.target_price}</span>
              </div>

              <div className="mini-chart">
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={product.history ?? []}>
      <CartesianGrid
        vertical={false}
        stroke="rgba(158, 230, 31, 0.08)"
      />

      <Tooltip
        contentStyle={{
          background: "rgba(3, 17, 17, 0.95)",
          border: "1px solid rgba(158, 230, 31, 0.25)",
          borderRadius: "12px",
          color: "#f4f7f5",
        }}
        formatter={(value) => [`R$ ${Number(value).toFixed(2).replace(".", ",")}`, "Preço"]}
        labelFormatter={() => "Histórico"}
      />

      <Line
        type="monotone"
        dataKey="price"
        stroke="var(--color-primary)"
        strokeWidth={3}
        dot={{ r: 3, fill: "var(--color-primary)" }}
        activeDot={{ r: 5 }}
      />
    </LineChart>
  </ResponsiveContainer>
</div>

              <span className={`status ${product.status}`}>
                {product.status}
              </span>
            </div>
          ))}
        </div>

        <div className="hero-panel">
          <div className="panel-label">Melhor oportunidade agora</div>
          <div className="panel-price">R$ 198,90</div>
          <div className="panel-info">
            Memória RAM caiu 18% e está abaixo do preço alvo.
          </div>

          <div className="scan-line" />
        </div>
      </section>
    </main>
  )
}

export default App