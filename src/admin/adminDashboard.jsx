import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Wallet,
  FileText,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  LogOut,
  Menu,
  X,
  Upload,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import "./AdminDashboard.css";

const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "payments", label: "Payments", icon: Wallet },
  { id: "services", label: "Service Requests", icon: FileText },
];

const money = (value) =>
  `KSh ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dateText = (value) =>
  value ? new Date(value).toLocaleString("en-KE") : "Not available";

const initialProduct = {
  name: "",
  description: "",
  category: "",
  price: "",
  stock: "0",
  image_url: "",
};

export default function AdminDashboard() {
  const [section, setSection] = useState("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [services, setServices] = useState([]);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(initialProduct);
  const [imageFile, setImageFile] = useState(null);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setMessage("");

    const results = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("order_items").select("*"),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("service_requests").select("*").order("created_at", { ascending: false }),
    ]);

    const labels = ["products", "orders", "order items", "payments", "service requests"];
    const failed = results
      .map((result, index) => result.error ? `${labels[index]}: ${result.error.message}` : null)
      .filter(Boolean);

    if (results[0].data) setProducts(results[0].data);
    if (results[1].data) setOrders(results[1].data);
    if (results[2].data) setOrderItems(results[2].data);
    if (results[3].data) setPayments(results[3].data);
    if (results[4].data) setServices(results[4].data);

    if (failed.length) {
      setMessage(`Some information could not be loaded: ${failed.join(" | ")}`);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const notify = (text) => {
    setMessage(text);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm(initialProduct);
    setImageFile(null);
    setShowProductForm(true);
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? 0),
      image_url: product.image_url || "",
    });
    setImageFile(null);
    setShowProductForm(true);
  };

  const saveProduct = async (event) => {
    event.preventDefault();

    if (!productForm.name.trim() || productForm.price === "") {
      notify("Please enter the product name and price.");
      return;
    }

    if (Number(productForm.price) < 0 || Number(productForm.stock) < 0) {
      notify("Price and stock cannot be negative.");
      return;
    }

    setBusy(true);
    let imageUrl = productForm.image_url;

    try {
      if (imageFile) {
        const safeName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "-");
        const filePath = `${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, imageFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        imageUrl = publicData.publicUrl;
      }

      const productData = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        category: productForm.category.trim(),
        price: Number(productForm.price),
        stock: Number(productForm.stock || 0),
        image_url: imageUrl || null,
        is_active: true,
      };

      const result = editingProduct
        ? await supabase.from("products").update(productData).eq("id", editingProduct.id)
        : await supabase.from("products").insert(productData);

      if (result.error) throw result.error;

      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm(initialProduct);
      setImageFile(null);
      await loadDashboard();
      notify(editingProduct ? "Product updated successfully." : "Product added successfully.");
    } catch (error) {
      notify(`Could not save product: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const deactivateProduct = async (product) => {
    if (!window.confirm(`Deactivate "${product.name}"? It will no longer be available as an active product.`)) return;

    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", product.id);

    if (error) {
      notify(`Could not deactivate product: ${error.message}`);
      return;
    }

    await loadDashboard();
    notify("Product deactivated.");
  };

  const updatePayment = async (payment, newStatus) => {
    const action = newStatus === "approved" ? "approve" : "reject";

    if (!window.confirm(`Are you sure you want to ${action} this payment? Only approve it after checking the M-Pesa transaction.`)) return;

    setBusy(true);
    try {
      const { error } = await supabase
        .from("payments")
        .update({ status: newStatus })
        .eq("id", payment.id);

      if (error) throw error;

      if (newStatus === "approved") {
        const { error: orderError } = await supabase
          .from("orders")
          .update({ status: "processing" })
          .eq("id", payment.order_id);

        if (orderError) throw orderError;
      }

      await loadDashboard();
      notify(newStatus === "approved" ? "Payment approved. Order moved to processing." : "Payment rejected.");
    } catch (error) {
      notify(`Payment update failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      notify(`Could not update order: ${error.message}`);
      return;
    }

    await loadDashboard();
    notify("Order status updated.");
  };

  const updateServiceStatus = async (requestId, status) => {
    const { error } = await supabase
      .from("service_requests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      notify(`Could not update request: ${error.message}`);
      return;
    }

    await loadDashboard();
    setSelectedService(null);
    notify("Service request updated.");
  };
  const openServiceDocument = async (documentPath) => {
  if (!documentPath) {
    notify("No document was uploaded.");
    return;
  }

  const newTab = window.open("about:blank", "_blank");

  if (!newTab) {
    notify("Please allow pop-ups for this website and try again.");
    return;
  }

  try {
  const { data: { user }, error: userError } =
    await supabase.auth.getUser();

  console.log("CURRENT ADMIN USER ID:", user?.id);
  console.log("CURRENT USER ERROR:", userError);

  // Your existing Storage list and signed URL code continues here.


    const folder = documentPath.substring(
  0,
  documentPath.lastIndexOf("/")
);

const { data: files, error: listError } = await supabase.storage
  .from("customer-document")
  .list(folder, { limit: 100 });

console.log("Folder being checked:", folder);
console.log("Files visible to admin:", files);
console.log("Storage list error:", listError);
   

    const { data, error } = await supabase.storage
      .from("customer-document")
      .createSignedUrl(documentPath, 60);
      console.log("Document path:", documentPath);
      console.log("Supabase data:", data);
      console.log("Supabase error:", error);

    if (error) throw error;

    if (!data?.signedUrl) {
      throw new Error("Supabase did not return a document URL.");
    }

    console.log("PDF signed URL generated successfully.");

    newTab.location.href = data.signedUrl;
  } catch (error) {
    newTab.close();
    console.error("PDF opening failed:", error);
    notify(`Could not open PDF: ${error.message}`);
  }
};

  const itemsForOrder = (orderId) =>
    orderItems.filter((item) => item.order_id === orderId);

  const paymentForOrder = (orderId) =>
    payments.find((payment) => payment.order_id === orderId);

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.category || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrders = orders.filter((order) =>
    `${order.customer_name || ""} ${order.customer_phone || ""} ${order.id}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const pendingOrders = orders.filter((order) => (order.status || "pending") === "pending");
  const pendingServices = services.filter((request) => (request.status || "pending") === "pending");

  const title = sections.find((item) => item.id === section)?.label || "Dashboard";

  return (
    <div className="vin-admin">
      <aside className={`vin-sidebar ${mobileMenu ? "vin-sidebar-open" : ""}`}>
        <div className="vin-brand">
          <div className="vin-brand-mark">VL</div>
          <div>
            <strong>VINLINE LINK</strong>
            <span>ENTERPRISE ADMIN</span>
          </div>
          <button className="vin-mobile-close" onClick={() => setMobileMenu(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="vin-menu-label">MAIN MENU</div>
        <nav className="vin-nav">
          {sections.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={section === item.id ? "active" : ""}
                onClick={() => {
                  setSection(item.id);
                  setSearch("");
                  setMobileMenu(false);
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === "payments" && pendingPayments.length > 0 && (
                  <b className="vin-nav-count">{pendingPayments.length}</b>
                )}
              </button>
            );
          })}
        </nav>

        <div className="vin-sidebar-bottom">
          <div className="vin-sidebar-note">
            <strong>Owner Control Panel</strong>
            <span>Manage your shop, orders and services.</span>
          </div>
        </div>
      </aside>

      <main className="vin-main">
        <header className="vin-topbar">
          <div className="vin-top-left">
            <button className="vin-mobile-menu" onClick={() => setMobileMenu(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
            <div>
              <span className="vin-eyebrow">VINLINE LINK ENTERPRISE</span>
              <h1>{title}</h1>
            </div>
          </div>
          <button className="vin-refresh" onClick={loadDashboard} disabled={loading}>
            <RefreshCw size={16} className={loading ? "vin-spin" : ""} />
            Refresh
          </button>
        </header>

        <div className="vin-content">
          {message && (
            <div className="vin-alert">
              <span>{message}</span>
              <button onClick={() => setMessage("")} aria-label="Dismiss message"><X size={17} /></button>
            </div>
          )}

          {loading ? (
            <div className="vin-loading">Loading your business information...</div>
          ) : (
            <>
              {section === "overview" && (
                <>
                  <div className="vin-welcome">
                    <div>
                      <h2>Welcome to your control panel</h2>
                      <p>Here is what is happening in your business today.</p>
                    </div>
                    <span className="vin-live"><i /> Dashboard connected</span>
                    </div>

                  <div className="vin-stats">
                    <StatCard icon={<Package />} label="Total Products" value={products.length} />
                    <StatCard icon={<ShoppingBag />} label="Total Orders" value={orders.length} />
                    <StatCard icon={<Wallet />} label="Pending Payments" value={pendingPayments.length} />
                    <StatCard icon={<FileText />} label="Pending Requests" value={pendingServices.length} />
                  </div>

                  <div className="vin-overview-grid">
                    <section className="vin-panel">
                      <div className="vin-panel-heading">
                        <div><h3>Recent Orders</h3><p>Latest customer orders</p></div>
                        <button className="vin-text-button" onClick={() => setSection("orders")}>View all</button>
                      </div>
                      {orders.length === 0 ? <Empty text="No orders have been received yet." /> : (
                        <div className="vin-compact-list">
                          {orders.slice(0, 5).map((order) => (
                            <div className="vin-compact-row" key={order.id}>
                              <div className="vin-round-icon"><ShoppingBag size={17} /></div>
                              <div className="vin-compact-info">
                                <strong>{order.customer_name || "Customer"}</strong>
                                <span>{dateText(order.created_at)}</span>
                              </div>
                              <div className="vin-compact-right">
                                <strong>{money(order.total_amount)}</strong>
                                <Status value={order.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="vin-panel">
                      <div className="vin-panel-heading">
                        <div><h3>Needs Your Attention</h3><p>Items waiting for action</p></div>
                      </div>
                      <div className="vin-attention">
                        <button onClick={() => setSection("payments")}>
                          <span className="vin-attention-icon"><Wallet size={19} /></span>
                          <span><strong>{pendingPayments.length} payments</strong><small>Awaiting verification</small></span>
                          <span className="vin-arrow">›</span>
                        </button>
                        <button onClick={() => setSection("orders")}>
                          <span className="vin-attention-icon"><ShoppingBag size={19} /></span>
                          <span><strong>{pendingOrders.length} orders</strong><small>Still pending</small></span>
                          <span className="vin-arrow">›</span>
                        </button>
                        <button onClick={() => setSection("services")}>
                          <span className="vin-attention-icon"><FileText size={19} /></span>
                          <span><strong>{pendingServices.length} requests</strong><small>Awaiting service</small></span>
                          <span className="vin-arrow">›</span>
                        </button>
                      </div>
                    </section>
                  </div>

                  <section className="vin-panel vin-quick-actions">
                    <div className="vin-panel-heading">
                      <div><h3>Quick Actions</h3><p>Common tasks</p></div>
                    </div>
                    <button onClick={openNewProduct}><Plus size={18} /> Add a new product</button>
                    <button onClick={() => setSection("payments")}><Wallet size={18} /> Review payments</button>
                    <button onClick={() => setSection("services")}><FileText size={18} /> View service requests</button>
                  </section>
                </>
              )}

              {section === "products" && (
                <section className="vin-panel">
                  <div className="vin-panel-heading vin-heading-wrap">
                    <div><h3>Product Management</h3><p>Add and manage your bookshop products.</p></div>
                    <button className="vin-primary" onClick={openNewProduct}><Plus size={17} /> Add Product</button>
                  </div>
                  <div className="vin-toolbar">
                    <div className="vin-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." /></div>
                    <span>{products.length} products</span>
                  </div>
                  {filteredProducts.length === 0 ? <Empty text="No products found. Add your first product." /> : (
                    <div className="vin-table-wrap">
                      <table className="vin-table">
                        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                          {filteredProducts.map((product) => (
                            <tr key={product.id}>
                              <td><div className="vin-product-cell">
                                {product.image_url ? <img src={product.image_url} alt={product.name} /> : <div className="vin-no-image"><Package size={19} /></div>}
                                <div><strong>{product.name}</strong><small>{product.description || "No description"}</small></div>
                              </div></td>
                              <td>{product.category || "—"}</td>
                              <td>{money(product.price)}</td>
                              <td>{product.stock ?? 0}</td>
                              <td><Status value={product.is_active ? "active" : "inactive"} /></td>
                              <td><div className="vin-actions">
                                <button title="Edit product" onClick={() => openEditProduct(product)}><Pencil size={16} /></button>
                                {product.is_active && <button className="vin-danger-icon" title="Deactivate product" onClick={() => deactivateProduct(product)}><Trash2 size={16} /></button>}
                              </div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {section === "orders" && (
                <section className="vin-panel">
                  <div className="vin-panel-heading"><div><h3>Customer Orders</h3><p>View orders, items and update progress.</p></div><span>{orders.length} orders</span></div>
                  <div className="vin-toolbar">
                    <div className="vin-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, phone or order..." /></div>
                  </div>
                  {filteredOrders.length === 0 ? <Empty text="No orders found." /> : (
                    <div className="vin-order-list">
                      {filteredOrders.map((order) => {
                        const items = itemsForOrder(order.id);
                        const payment = paymentForOrder(order.id);
                        return (
                          <article className="vin-order-card" key={order.id}>
                            <div className="vin-order-top">
                              <div><strong>Order #{order.id.slice(0, 8).toUpperCase()}</strong><span>{dateText(order.created_at)}</span></div>
                              <Status value={order.status} />
                            </div>
                            <div className="vin-order-customer">
                              <strong>{order.customer_name || "Customer details unavailable"}</strong>
                              <span>{order.customer_phone || "No phone"} {order.customer_email ? `• ${order.customer_email}` : ""}</span>
                            </div>
                            <div className="vin-order-items">
                              {items.length ? items.map((item) => (
                                <div key={item.id}><span>{item.product_name} × {item.quantity}</span><strong>{money(item.unit_price * item.quantity)}</strong></div>
                              )) : <small>Order items could not be found.</small>}
                            </div>
                            <div className="vin-order-meta">
                              <span>Delivery: {order.delivery_method || "Not specified"}</span>
                              {order.delivery_address && <span>Address: {order.delivery_address}</span>}
                              <span>Delivery fee: {money(order.delivery_fee)}</span>
                              <strong>Total: {money(order.total_amount)}</strong>
                            </div>
                            {payment && <div className="vin-payment-inline">Payment: <Status value={payment.status} /> <span>{payment.transaction_code || "No transaction code"}</span></div>}
                            <div className="vin-order-bottom">
                              <label>Update order status
                                <select value={order.status || "pending"} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                                  <option value="pending">Pending</option>
                                  <option value="processing">Processing</option>
                                  <option value="ready">Ready for pickup</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </label>
                              <button className="vin-secondary" onClick={() => setSelectedOrder(order)}><Eye size={16} /> View details</button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {section === "payments" && (
                <section className="vin-panel">
                  <div className="vin-panel-heading"><div><h3>Payment Verification</h3><p>Check M-Pesa transaction details before approving.</p></div><span>{pendingPayments.length} awaiting review</span></div>
                  {payments.length === 0 ? <Empty text="No payment records found." /> : (
                    <div className="vin-table-wrap">
                      <table className="vin-table">
                        <thead><tr><th>Order</th><th>Amount</th><th>Method</th><th>Transaction Code</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
                        <tbody>
                          {payments.map((payment) => (
                            <tr key={payment.id}>
                              <td>#{payment.order_id.slice(0, 8).toUpperCase()}</td>
                              <td>{money(payment.amount)}</td>
                              <td>{payment.payment_method || "M-Pesa"}</td>
                              <td><strong>{payment.transaction_code || "Not supplied"}</strong></td>
                              <td>{dateText(payment.created_at)}</td>
                              <td><Status value={payment.status} /></td>
                              <td><div className="vin-actions">
                                {payment.status === "pending" ? <>
                                  <button className="vin-approve" title="Approve payment" disabled={busy} onClick={() => updatePayment(payment, "approved")}><CheckCircle size={17} /></button>
                                  <button className="vin-reject" title="Reject payment" disabled={busy} onClick={() => updatePayment(payment, "rejected")}><XCircle size={17} /></button>
                                </> : <span className="vin-muted">Reviewed</span>}
                              </div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {section === "services" && (
                <section className="vin-panel">
                  <div className="vin-panel-heading"><div><h3>Service Requests</h3><p>Customer requests and uploaded documents.</p></div><span>{services.length} requests</span></div>
                  {services.length === 0 ? <Empty text="No service requests received yet." /> : (
                    <div className="vin-order-list">
                      {services.map((request) => (
                        <article className="vin-order-card" key={request.id}>
                          <div className="vin-order-top">
                            <div><strong>{request.service_type}</strong><span>{dateText(request.created_at)}</span></div>
                            <Status value={request.status} />
                          </div>
                          <div className="vin-order-customer">
                            <strong>{request.customer_name || "Customer"}</strong>
                            <span>{request.phone || "No phone number"}</span>
                          </div>
                          <p className="vin-request-description">{request.description || "No additional details supplied."}</p>
                          <div className="vin-order-bottom">
                            <label>Update request
                              <select value={request.status || "pending"} onChange={(e) => updateServiceStatus(request.id, e.target.value)}>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </label>
                            <button className="vin-secondary" onClick={() => setSelectedService(request)}><Eye size={16} /> View request</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {showProductForm && (
        <div className="vin-modal-backdrop" onClick={() => setShowProductForm(false)}>
          <form className="vin-modal" onSubmit={saveProduct} onClick={(e) => e.stopPropagation()}>
            <div className="vin-modal-heading"><div><h2>{editingProduct ? "Edit Product" : "Add New Product"}</h2><p>Enter the product details below.</p></div><button type="button" onClick={() => setShowProductForm(false)}><X /></button></div>
            <label>Product name *<input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="e.g. Exercise Book" /></label>
            <label>Description<textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Describe the product..." rows="3" /></label>
            <div className="vin-form-row">
              <label>Category<input value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} placeholder="e.g. Stationery" /></label>
              <label>Price (KSh) *<input required type="number" min="0" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label>
            </div>
            <div className="vin-form-row">
              <label>Stock quantity<input type="number" min="0" step="1" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} /></label>
              <label>Product image<input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} /></label>
            </div>
            {productForm.image_url && !imageFile && <div className="vin-current-image"><img src={productForm.image_url} alt="Current product" /><span>Current product image</span></div>}
            {imageFile && <p className="vin-file-picked"><Upload size={15} /> {imageFile.name}</p>}
            <div className="vin-modal-actions"><button type="button" className="vin-secondary" onClick={() => setShowProductForm(false)}>Cancel</button><button type="submit" className="vin-primary" disabled={busy}>{busy ? "Saving..." : editingProduct ? "Save Changes" : "Add Product"}</button></div>
          </form>
        </div>
      )}

      {selectedOrder && (
        <DetailModal title={`Order #${selectedOrder.id.slice(0, 8).toUpperCase()}`} onClose={() => setSelectedOrder(null)}>
          <p><strong>Customer:</strong> {selectedOrder.customer_name || "—"}</p>
          <p><strong>Phone:</strong> {selectedOrder.customer_phone || "—"}</p>
          <p><strong>Email:</strong> {selectedOrder.customer_email || "—"}</p>
          <p><strong>Delivery method:</strong> {selectedOrder.delivery_method || "—"}</p>
          <p><strong>Delivery address:</strong> {selectedOrder.delivery_address || "—"}</p>
          <p><strong>Delivery fee:</strong> {money(selectedOrder.delivery_fee)}</p>
          <p><strong>Total:</strong> {money(selectedOrder.total_amount)}</p>
          <h4>Items ordered</h4>
          {itemsForOrder(selectedOrder.id).map((item) => <p key={item.id}>{item.product_name} × {item.quantity} — {money(item.unit_price * item.quantity)}</p>)}
          <p><strong>Order date:</strong> {dateText(selectedOrder.created_at)}</p>
        </DetailModal>
      )}

      {selectedService && (
        <DetailModal title="Service Request Details" onClose={() => setSelectedService(null)}>
          <p><strong>Service:</strong> {selectedService.service_type}</p>
          <p><strong>Customer:</strong> {selectedService.customer_name || "—"}</p>
          <p><strong>Phone:</strong> {selectedService.phone || "—"}</p>
          <p><strong>Description:</strong> {selectedService.description || "—"}</p>
          <p><strong>Submitted:</strong> {dateText(selectedService.created_at)}</p>
          {selectedService.document_path && (
            <button
  type="button"
  className="vin-document-link"
  onClick={() => openServiceDocument(selectedService.document_path)}
>
  <ExternalLink size={16} />
  Open uploaded document
</button>
            
          )}
        </DetailModal>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return <div className="vin-stat-card"><div className="vin-stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function Status({ value }) {
  const status = String(value || "pending").toLowerCase();
  return <span className={`vin-status vin-status-${status.replace(/\s+/g, "-")}`}>{status.replace(/_/g, " ")}</span>;
}

function Empty({ text }) {
  return <div className="vin-empty"><Package size={28} /><p>{text}</p></div>;
}

function DetailModal({ title, onClose, children }) {
  return <div className="vin-modal-backdrop" onClick={onClose}><div className="vin-modal vin-detail-modal" onClick={(e) => e.stopPropagation()}><div className="vin-modal-heading"><h2>{title}</h2><button onClick={onClose}><X /></button></div><div className="vin-detail-content">{children}</div><div className="vin-modal-actions"><button className="vin-primary" onClick={onClose}>Close</button></div></div></div>;
}