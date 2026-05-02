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

  const [showModal, setShowModal] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    store: "",
    target_price: "",
    notes: ""
  })


  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const analyzeDeal = (product) => {
    const currentPrice = Number(product.current_price)
    const targetPrice = Number(product.target_price)
    const history = product.history ?? []

    if (!currentPrice || !targetPrice) {
      return {
        label: "Sem preço atual",
        message: "Ainda não há dados suficientes para analisar este produto."
      }
    }

    const difference = currentPrice - targetPrice
    const percentageFromTarget = (difference / targetPrice) * 100

    const prices = history.map((item) => Number(item.price))
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : currentPrice
    const isLowestPrice = currentPrice <= lowestPrice

    if (currentPrice <= targetPrice) {
      return {
        label: "Comprar agora",
        message: isLowestPrice
          ? `Melhor preço registrado até agora (R$ ${formatPrice(currentPrice)})`
          : `Está R$ ${formatPrice(Math.abs(difference))} abaixo do alvo (mínimo: R$ ${formatPrice(lowestPrice)})`
      }
    }

    if (history.length >= 2) {
      const previousPrice = Number(history[history.length - 2].price)
      const priceDrop = previousPrice - currentPrice

      if (priceDrop > 0 && percentageFromTarget <= 10) {
        return {
          label: "Quase no alvo",
          message: `Caiu R$ ${formatPrice(priceDrop)} recentemente, mas ainda está acima do alvo.`,
          lowestPrice,
          isLowestPrice
        }
      }
    }

    return {
      label: "Observar",
      message: `Está ${percentageFromTarget.toFixed(1).replace(".", ",")}% acima do alvo (mínimo: R$ ${formatPrice(lowestPrice)})`
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch("http://127.0.0.1:8000/api/products/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          target_price: Number(formData.target_price)
        })
      })

      const data = await res.json()

      // 👉 monta o novo produto manualmente
      const newProduct = {
        id: data.product_id,
        ...formData,
        current_price: null,
        previous_price: null,
        status: "observing",
        history: []
      }

      // 👉 atualiza lista SEM reload
      setProducts((prev) => [newProduct, ...prev])

      // fecha modal
      setShowModal(false)

      // limpa form
      setFormData({
        name: "",
        url: "",
        store: "",
        target_price: "",
        notes: ""
      })

    } catch (err) {
      console.error("Erro ao criar produto:", err)
    }
  }

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

  const formatPrice = (value) => {
    if (value === null || value === undefined) return "-"
    return Number(value).toFixed(2).replace(".", ",")
  }


  return (
    <main>
      <section className="hero">
        <div className="hero-text">
          <div className="logo-title">
            <img src={logoIcon} alt="icon" className="logo-icon" />
            <img src={logoFull} alt="SniperPrice AI" className="logo-full" />
          </div>

          <p>
            Detecte oportunidades reais de compra com análise de preços e histórico.
          </p>
          <button className="add-button" onClick={() => setShowModal(true)}>
            + Adicionar produto
          </button>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="products-grid">
          {products.map((product) => (
            <div className="product-card" key={product.id}>
              {(() => {
                const dealAnalysis = analyzeDeal(product)

                return (
                  <>
                    <h3>{product.name}</h3>

                    <p className="store">{product.store}</p>

                    <div className="prices">
                      <span>Atual: R$ {formatPrice(product.current_price)}</span>
                      <span>Alvo: R$ {formatPrice(product.target_price)}</span>
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
                            formatter={(value) => [
                              `R$ ${Number(value).toFixed(2).replace(".", ",")}`,
                              "Preço"
                            ]}
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

                    <div className="deal-analysis">
                      <strong>{dealAnalysis.label}</strong>
                      <p>{dealAnalysis.message}</p>

                      
                    </div>
                  </>
                )
              })()}
            </div>
          ))}
        </div>


      </section>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Novo produto</h2>

            <form onSubmit={handleSubmit}>
              <input
                name="name"
                placeholder="Nome"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <input
                name="url"
                placeholder="Link"
                value={formData.url}
                onChange={handleChange}
                required
              />

              <input
                name="store"
                placeholder="Loja"
                value={formData.store}
                onChange={handleChange}
                required
              />

              <input
                name="target_price"
                placeholder="Preço alvo"
                type="number"
                value={formData.target_price}
                onChange={handleChange}
                required
              />

              <textarea
                name="notes"
                placeholder="Observações"
                value={formData.notes}
                onChange={handleChange}
              />

              <div className="modal-actions">
                <button type="submit">Salvar</button>
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default App