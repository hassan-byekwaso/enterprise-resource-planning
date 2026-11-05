import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { formatCurrency } from "../config/locale";
import {
  createCategory,
  createProduct,
  createStockMovement,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  fetchStockMovements,
  InventoryServiceError,
  updateProduct,
  type Category,
  type Product,
  type ProductInput,
  type StockMovement,
  type StockMovementType,
} from "../services/inventoryService";

type InventoryModal = "product" | "categories" | "movement" | null;

export function InventoryView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [modal, setModal] = useState<InventoryModal>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError("");
    try {
      const [nextProducts, nextCategories, nextMovements] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchStockMovements(),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
      setMovements(nextMovements);
    } catch (cause) {
      setLoadError(getErrorMessage(cause, "Could not load inventory"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stockQuantity <= product.minStockLevel).length,
    [products],
  );
  const totalValuation = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.price) * product.stockQuantity, 0),
    [products],
  );

  function openProductForm(product: Product | null = null) {
    setEditingProduct(product);
    setActionError("");
    setModal("product");
  }

  function openCategoryForm() {
    setActionError("");
    setModal("categories");
  }

  function openMovementForm(product: Product) {
    setSelectedProduct(product);
    setActionError("");
    setModal("movement");
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setEditingProduct(null);
    setSelectedProduct(null);
    setActionError("");
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const price = Number(values.get("price"));
    const minStockLevel = Number(values.get("minStockLevel"));
    const categoryId = String(values.get("categoryId") ?? "");

    if (!Number.isFinite(price) || !Number.isInteger(minStockLevel) || minStockLevel < 0) {
      setActionError("Enter a valid price and non-negative minimum stock level.");
      setSaving(false);
      return;
    }

    const productInput: ProductInput = {
      name: String(values.get("name") ?? "").trim(),
      sku: String(values.get("sku") ?? "").trim(),
      price,
      minStockLevel,
      categoryId: categoryId || null,
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productInput);
      } else {
        const initialStock = Number(values.get("initialStock"));
        if (!Number.isInteger(initialStock) || initialStock < 0) {
          setActionError("Initial stock must be a non-negative whole number.");
          setSaving(false);
          return;
        }
        await createProduct({ ...productInput, initialStock });
      }
      setModal(null);
      setEditingProduct(null);
      await loadData();
    } catch (cause) {
      setActionError(getErrorMessage(cause, "Could not save product"));
    } finally {
      setSaving(false);
    }
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError("");
    const values = new FormData(event.currentTarget);
    try {
      await createCategory({
        name: String(values.get("name") ?? "").trim(),
        description: String(values.get("description") ?? "").trim(),
      });
      await loadData();
    } catch (cause) {
      setActionError(getErrorMessage(cause, "Could not create category"));
    } finally {
      setSaving(false);
    }
  }

  async function handleMovementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);
    setActionError("");
    const values = new FormData(event.currentTarget);
    const type = String(values.get("type")) as StockMovementType;
    const enteredQuantity = Number(values.get("quantity"));
    const quantity = type === "ADJUSTMENT" && values.get("direction") === "OUT"
      ? -enteredQuantity
      : enteredQuantity;

    try {
      await createStockMovement({
        productId: selectedProduct.id,
        type,
        quantity,
        reference: String(values.get("reference") ?? "").trim(),
      });
      setModal(null);
      setSelectedProduct(null);
      await loadData();
    } catch (cause) {
      setActionError(getErrorMessage(cause, "Could not record stock movement"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete ${product.name}? Products with stock movement history cannot be deleted.`)) return;
    setActionError("");
    try {
      await deleteProduct(product.id);
      await loadData();
    } catch (cause) {
      setActionError(getErrorMessage(cause, "Could not delete product"));
    }
  }

  return (
    <section className="inventory-page">
      <header className="inventory-page__header">
        <div>
          <p className="dashboard-eyebrow inventory-page__eyebrow">STOCK CONTROL</p>
          <h1>Inventory</h1>
          <p>Manage products, monitor stock levels, and review inventory activity.</p>
        </div>
        <div className="inventory-actions">
          <button className="inventory-button inventory-button--secondary" onClick={openCategoryForm}>Manage categories</button>
          <button className="inventory-button" onClick={() => openProductForm()}>+ Add product</button>
        </div>
      </header>

      {actionError && !modal && <p className="users-alert" role="alert">{actionError}</p>}
      {loadError && <p className="users-alert" role="alert">{loadError}</p>}

      <div className="inventory-summary">
        <SummaryCard label="Total products" value={loading ? "—" : String(products.length)} icon="▦" tone="blue" />
        <SummaryCard label="Low stock alerts" value={loading ? "—" : String(lowStockCount)} icon="!" tone="amber" />
        <SummaryCard label="Total valuation" value={loading ? "—" : formatCurrency(totalValuation)} icon="$" tone="green" />
      </div>

      <section className="inventory-panel">
        <div className="inventory-panel__heading">
          <div>
            <h2>Products</h2>
            <p>Current stock and reorder thresholds</p>
          </div>
          <span className="inventory-count">{products.length} {products.length === 1 ? "item" : "items"}</span>
        </div>
        {loading ? (
          <div className="users-state" role="status">Loading products…</div>
        ) : products.length === 0 && !loadError ? (
          <div className="users-state"><strong>No products yet</strong><span>Add a product to start tracking inventory.</span></div>
        ) : (
          <div className="users-table-scroll">
            <table className="users-table inventory-table">
              <thead>
                <tr><th scope="col">Product</th><th scope="col">SKU</th><th scope="col">Category</th><th scope="col">Price</th><th scope="col">In stock</th><th scope="col">Actions</th></tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const lowStock = product.stockQuantity <= product.minStockLevel;
                  return (
                    <tr key={product.id}>
                      <td><strong className="inventory-product-name">{product.name}</strong></td>
                      <td>{product.sku}</td>
                      <td>{product.category?.name ?? "Uncategorized"}</td>
                      <td>{formatCurrency(Number(product.price))}</td>
                      <td><span className={`stock-badge${lowStock ? " stock-badge--low" : ""}`}>{product.stockQuantity} {lowStock ? "· Low" : ""}</span></td>
                      <td>
                        <div className="inventory-row-actions">
                          <button type="button" onClick={() => openMovementForm(product)}>Stock</button>
                          <button type="button" onClick={() => openProductForm(product)}>Edit</button>
                          <button type="button" className="inventory-row-actions__delete" onClick={() => void handleDelete(product)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="inventory-panel">
        <div className="inventory-panel__heading">
          <div><h2>Recent stock movements</h2><p>Latest 100 inventory changes</p></div>
        </div>
        {loading ? (
          <div className="users-state">Loading activity…</div>
        ) : movements.length === 0 ? (
          <div className="users-state"><span>Stock movement history will appear here.</span></div>
        ) : (
          <div className="users-table-scroll">
            <table className="users-table inventory-table">
              <thead><tr><th scope="col">Product</th><th scope="col">Movement</th><th scope="col">Quantity</th><th scope="col">Reference</th><th scope="col">Recorded by</th><th scope="col">Date</th></tr></thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td><strong className="inventory-product-name">{movement.product.name}</strong><small className="inventory-table__sub">{movement.product.sku}</small></td>
                    <td><span className={`movement-type movement-type--${movement.type.toLowerCase()}`}>{movement.type}</span></td>
                    <td>{movement.quantity > 0 && movement.type === "ADJUSTMENT" ? "+" : ""}{movement.quantity}</td>
                    <td>{movement.reference ?? "—"}</td>
                    <td>{movement.user.name}</td>
                    <td>{formatDate(movement.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && (
        <div className="user-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}>
          <section className="user-dialog inventory-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title">
            <header className="user-dialog__header">
              <div>
                <span className="user-dialog__icon" aria-hidden="true">{modal === "movement" ? "↕" : modal === "categories" ? "▦" : "+"}</span>
                <div>
                  <h2 id="inventory-dialog-title">
                    {modal === "product" ? (editingProduct ? "Edit product" : "Add product") : modal === "categories" ? "Manage categories" : "Log stock movement"}
                  </h2>
                  <p>{modal === "movement" && selectedProduct ? `${selectedProduct.name} · ${selectedProduct.stockQuantity} in stock` : "Keep inventory details accurate and up to date."}</p>
                </div>
              </div>
              <button type="button" className="user-dialog__close" aria-label="Close dialog" disabled={saving} onClick={closeModal}>×</button>
            </header>

            {modal === "product" && (
              <form className="user-form" onSubmit={(event) => void handleProductSubmit(event)}>
                <label>Product name<input name="name" required maxLength={160} defaultValue={editingProduct?.name} /></label>
                <label>SKU<input name="sku" required maxLength={64} defaultValue={editingProduct?.sku} /></label>
                <div className="inventory-form__row">
                  <label>Unit price<input name="price" type="number" min="0" step="0.01" required defaultValue={editingProduct ? Number(editingProduct.price) : ""} /></label>
                  <label>Minimum stock<input name="minStockLevel" type="number" min="0" step="1" required defaultValue={editingProduct?.minStockLevel ?? 0} /></label>
                </div>
                {!editingProduct && <label>Initial stock<input name="initialStock" type="number" min="0" step="1" required defaultValue={0} /><span className="field-hint">Initial stock is recorded in the movement history.</span></label>}
                <label>Category
                  <select name="categoryId" defaultValue={editingProduct?.categoryId ?? ""}>
                    <option value="">Uncategorized</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
                {actionError && <p className="error-message" role="alert">{actionError}</p>}
                <FormActions saving={saving} onCancel={closeModal} submitLabel={editingProduct ? "Save changes" : "Add product"} />
              </form>
            )}

            {modal === "categories" && (
              <div className="category-manager">
                <form className="user-form category-form" onSubmit={(event) => void handleCategorySubmit(event)}>
                  <label>Category name<input name="name" required maxLength={100} /></label>
                  <label>Description <span className="field-hint">(optional)</span><input name="description" maxLength={500} /></label>
                  {actionError && <p className="error-message" role="alert">{actionError}</p>}
                  <div className="user-form__actions">
                    <button type="submit" className="users-create-button" disabled={saving}>{saving ? "Adding…" : "Add category"}</button>
                  </div>
                </form>
                <div className="category-list">
                  <strong>Categories ({categories.length})</strong>
                  {categories.length === 0 ? <p>No categories created yet.</p> : categories.map((category) => (
                    <div className="category-list__item" key={category.id}>
                      <span><strong>{category.name}</strong>{category.description && <small>{category.description}</small>}</span>
                      <small>{category._count?.products ?? 0} products</small>
                    </div>
                  ))}
                </div>
                <div className="user-form__actions category-manager__footer">
                  <button type="button" className="user-cancel-button" onClick={closeModal}>Done</button>
                </div>
              </div>
            )}

            {modal === "movement" && selectedProduct && (
              <form className="user-form" onSubmit={(event) => void handleMovementSubmit(event)}>
                <label>Movement type
                  <select name="type" defaultValue="IN">
                    <option value="IN">Restock (stock in)</option>
                    <option value="OUT">Sale / issue (stock out)</option>
                    <option value="ADJUSTMENT">Stock adjustment</option>
                  </select>
                </label>
                <label>Quantity<input name="quantity" type="number" min="1" step="1" required /></label>
                <label>Direction for adjustment
                  <select name="direction" defaultValue="IN">
                    <option value="IN">Increase stock</option>
                    <option value="OUT">Decrease stock</option>
                  </select>
                  <span className="field-hint">Used only when movement type is Stock adjustment.</span>
                </label>
                <label>Reference <span className="field-hint">(optional)</span><input name="reference" maxLength={200} placeholder="Invoice, order, or note" /></label>
                {actionError && <p className="error-message" role="alert">{actionError}</p>}
                <FormActions saving={saving} onCancel={closeModal} submitLabel="Record movement" />
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: string; icon: string; tone: string }) {
  return (
    <article className="summary-card inventory-summary-card">
      <div className={`summary-card__icon summary-card__icon--${tone}`} aria-hidden="true">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{label === "Low stock alerts" ? "Products at or below minimum" : label === "Total valuation" ? "Current quantity × unit price" : "Across all categories"}</span>
    </article>
  );
}

function FormActions({ saving, onCancel, submitLabel }: { saving: boolean; onCancel: () => void; submitLabel: string }) {
  return (
    <div className="user-form__actions">
      <button type="button" className="user-cancel-button" disabled={saving} onClick={onCancel}>Cancel</button>
      <button type="submit" className="users-create-button" disabled={saving}>{saving ? "Saving…" : submitLabel}</button>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getErrorMessage(cause: unknown, fallback: string): string {
  if (!(cause instanceof Error)) return fallback;
  if (cause instanceof InventoryServiceError && cause.status === 401) return "Your session has expired. Sign in again.";
  if (cause instanceof InventoryServiceError && cause.status === 403) return "You do not have permission to manage inventory.";
  return cause.message || fallback;
}
