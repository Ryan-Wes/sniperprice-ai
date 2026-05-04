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
  const [editingProduct, setEditingProduct] = useState(null)

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

  const handleEdit = (product) => {
    setEditingProduct(product)

    setFormData({
      name: product.name,
      url: product.url,
      store: product.store,
      target_price: product.target_price,
      notes: product.notes || ""
    })

    setShowModal(true)
  }

  const handleDelete = async (id) => {
    const confirmDelete = confirm("Tem certeza que quer deletar?")

    if (!confirmDelete) return

    try {
      await fetch(`http://127.0.0.1:8000/api/products/${id}`, {
        method: "DELETE"
      })

      // remove do state
      setProducts((prev) => prev.filter((p) => p.id !== id))

    } catch (err) {
      console.error("Erro ao deletar:", err)
    }
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

    let proximityToLowest = 0

    if (lowestPrice > 0) {
      proximityToLowest = ((currentPrice - lowestPrice) / lowestPrice) * 100
    }

    let hasContinuousDrop = false
    let hasContinuousRise = false

    if (prices.length >= 3) {
      const recent = prices.slice(-3)

      hasContinuousDrop = recent.every((price, index) => {
        if (index === 0) return true
        return price < recent[index - 1]
      })

      hasContinuousRise = recent.every((price, index) => {
        if (index === 0) return true
        return price > recent[index - 1]
      })
    }

    let trend = "Sem dados"

    if (prices.length >= 3) {
      const recent = prices.slice(-3)

      const first = recent[0]
      const last = recent[recent.length - 1]

      const change = ((last - first) / first) * 100

      if (hasContinuousDrop) {
        trend = "Queda contínua"
      } else if (hasContinuousRise) {
        trend = "Alta contínua"
      } else if (change < -3) {
        trend = "Tendência de queda"
      } else if (change > 3) {
        trend = "Tendência de alta"
      } else {
        trend = "Preço estável"
      }
    } else if (prices.length >= 2) {
      const last = prices[prices.length - 1]
      const previous = prices[prices.length - 2]

      if (last < previous) {
        trend = "Tendência de queda"
      } else if (last > previous) {
        trend = "Tendência de alta"
      } else {
        trend = "Preço estável"
      }
    }

    if (currentPrice <= targetPrice) {
      return {
        label: "Comprar agora",
        message: isLowestPrice
          ? `Melhor preço até agora. ${trend}.`
          : proximityToLowest <= 3
            ? `Muito próximo do menor preço (${formatPrice(lowestPrice)}). ${trend}.`
            : trend.includes("Subiu")
              ? `Já esteve mais barato (mín: R$ ${formatPrice(lowestPrice)}). ${trend}.`
              : `Abaixo do alvo, mas ainda distante do mínimo (R$ ${formatPrice(lowestPrice)}). ${trend}.`
      }
    }

    if (history.length >= 2) {
      const previousPrice = Number(history[history.length - 2].price)
      const priceDrop = previousPrice - currentPrice

      if (priceDrop > 0 && percentageFromTarget <= 10) {
        return {
          label: "Quase no alvo",
          message: `Quase no alvo. ${trend}.`
        }
      }
    }

    return {
      label: "Observar",
      message: `${percentageFromTarget.toFixed(1).replace(".", ",")}% acima do alvo (mín: R$ ${formatPrice(lowestPrice)}). ${trend}.`
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      let res

      if (editingProduct) {
        // 🔁 MODO EDIÇÃO
        res = await fetch(
          `http://127.0.0.1:8000/api/products/${editingProduct.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              ...formData,
              target_price: Number(formData.target_price)
            })
          }
        )

        const updated = await res.json()

        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
        )
      } else {
        // ➕ MODO CRIAÇÃO
        res = await fetch("http://127.0.0.1:8000/api/products/", {
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

        const newProduct = {
          id: data.product_id,
          ...formData,
          current_price: null,
          previous_price: null,
          status: "observing",
          history: []
        }

        setProducts((prev) => [newProduct, ...prev])
      }

      // reset
      setShowModal(false)
      setEditingProduct(null)

      setFormData({
        name: "",
        url: "",
        store: "",
        target_price: "",
        notes: ""
      })
    } catch (err) {
      console.error("Erro:", err)
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

                    <button
                      className="edit-button"
                      onClick={() => handleEdit(product)}
                    >
                      Editar
                    </button>

                    <button
                      className="delete-button"
                      onClick={() => handleDelete(product.id)}
                    >
                      Deletar
                    </button>
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
            <h2>{editingProduct ? "Editar produto" : "Novo produto"}</h2>

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