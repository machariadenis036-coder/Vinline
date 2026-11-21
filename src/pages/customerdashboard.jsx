import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  User,
  ShoppingBag,
  CreditCard,
  FileText,
  LogOut,
  Lock,
  RefreshCw,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Home,
  ChevronRight
} from "lucide-react";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6fb",
    padding: "25px 16px",
    color: "#172033"
  },
  container: {
    maxWidth: "1150px",
    margin: "0 auto"
  },
  header: {
    background: "#102b50",
    color: "white",
    padding: "22px",
    borderRadius: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px"
  },
  card: {
    background: "white",
    padding: "22px",
    borderRadius: "12px",
    border: "1px solid #e5e9f1",
    marginBottom: "18px"
  },
  button: {
    border: "none",
    borderRadius: "8px",
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: "600"
  },
  muted: {
    color: "#64748b",
    fontSize: "14px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "15px",
    margin: "22px 0"
  },
  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #d8deea",
    borderRadius: "8px",
    marginTop: "7px",
    marginBottom: "15px",
    boxSizing: "border-box"
  }
};

function formatDate(value) {
  if (!value) return "Date unavailable";

  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatMoney(value) {
  return `KES ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function Status({ value }) {
  const status = (value || "pending").toLowerCase();

  const colors = {
    completed: ["#dcfce7", "#166534"],
    approved: ["#dcfce7", "#166534"],
    delivered: ["#dcfce7", "#166534"],
    pending: ["#fef3c7", "#92400e"],
    processing: ["#dbeafe", "#1d4ed8"],
    rejected: ["#fee2e2", "#b91c1c"],
    cancelled: ["#fee2e2", "#b91c1c"]
  };

  const color = colors[status] || ["#e2e8f0", "#334155"];

  return (
    <span style={{
      background: color[0],
      color: color[1],
      padding: "5px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "700",
      textTransform: "capitalize",
      display: "inline-block"
    }}>
      {status}
    </span>
  );
}

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  async function loadDashboard(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        navigate("/customer-login");
        return;
      }

      const currentUser = authData.user;
      setUser(currentUser);

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("id, full_name, phone, role, created_at")
          .eq("id", currentUser.id)
          .single();

      if (profileError) throw profileError;

      if (profileData.role !== "customer") {
        await supabase.auth.signOut();
        navigate("/customer-login");
        return;
      }

      setProfile(profileData);

      const [
        ordersResult,
        servicesResult
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("service_requests")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (servicesResult.error) throw servicesResult.error;

      const customerOrders = ordersResult.data || [];
      setOrders(customerOrders);
      setServiceRequests(servicesResult.data || []);

      const orderIds = customerOrders.map((order) => order.id);

      if (orderIds.length > 0) {
        const [itemsResult, paymentsResult] = await Promise.all([
          supabase
            .from("order_items")
            .select("*")
            .in("order_id", orderIds),

          supabase
            .from("payments")
            .select("*")
            .in("order_id", orderIds)
            .order("created_at", { ascending: false })
        ]);

        if (itemsResult.error) throw itemsResult.error;
        if (paymentsResult.error) throw paymentsResult.error;

        setOrderItems(itemsResult.data || []);
        setPayments(paymentsResult.data || []);
      } else {
        setOrderItems([]);
        setPayments([]);
      }

    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err.message || "Unable to load your account.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      return;
    }

    navigate("/customer-login");
  }

  async function handlePasswordChange(e) {
    e.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("Password must have at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordMessage("Your password has been updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }

    setChangingPassword(false);
  }

  function tabButton(id, label, Icon) {
    const active = activeTab === id;

    return (
      <button
        key={id}
        onClick={() => setActiveTab(id)}
        style={{
          ...styles.button,
          background: active ? "#102b50" : "#edf1f7",
          color: active ? "white" : "#26364d",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        <Icon size={17} />
        {label}
      </button>
    );
  }

  if (loading) {
    return (
      <div style={{ ...styles.page, textAlign: "center", paddingTop: "100px" }}>
        <RefreshCw size={30} />
        <p>Loading your account...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div style={{ ...styles.page, textAlign: "center", paddingTop: "70px" }}>
        <AlertCircle size={35} color="#dc2626" />
        <h2>Unable to open your account</h2>
        <p>{error}</p>
        <button
          style={{ ...styles.button, background: "#102b50", color: "white" }}
          onClick={() => loadDashboard()}
        >
          Try Again
        </button>
        <p><Link to="/">Back to Website</Link></p>
      </div>
    );
  }

  const totalSpent = orders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  );

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <header style={styles.header}>
          <div>
            <h2 style={{ margin: "0 0 6px" }}>
              VINLINE LINK ENTERPRISE
            </h2>
            <p style={{ margin: 0, opacity: 0.85 }}>
              Customer Account Dashboard
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link
              to="/"
              style={{
                ...styles.button,
                background: "white",
                color: "#102b50",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "7px"
              }}
            >
              <Home size={16} /> Website
            </Link>

            <button
              onClick={handleLogout}
              style={{
                ...styles.button,
                background: "#b91c1c",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: "7px"
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {error && (
          <div style={{
            ...styles.card,
            color: "#b91c1c",
            marginTop: "18px"
          }}>
            {error}
          </div>
        )}

        <section style={{ ...styles.card, marginTop: "20px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "15px"
          }}>
            <div style={{
              background: "#e0eaff",
              color: "#102b50",
              borderRadius: "50%",
              padding: "14px"
            }}>
              <User size={30} />
            </div>

            <div>
              <h2 style={{ margin: "0 0 5px" }}>
                Welcome, {profile?.full_name || "Customer"}
              </h2>
              <p style={styles.muted}>
                {user?.email}
              </p>
            </div>

            <button
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              style={{
                ...styles.button,
                background: "#edf1f7",
                marginLeft: "auto"
              }}
            >
              <RefreshCw size={16} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        <nav style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "9px",
          marginBottom: "22px"
        }}>
          {tabButton("overview", "Overview", Home)}
          {tabButton("profile", "My Profile", User)}
          {tabButton("orders", "My Orders", ShoppingBag)}
          {tabButton("payments", "Payments", CreditCard)}
          {tabButton("services", "Service Requests", FileText)}
          {tabButton("password", "Change Password", Lock)}
        </nav>

        {activeTab === "overview" && (
          <>
            <div style={styles.grid}>
              <div style={styles.card}>
                <ShoppingBag color="#2563eb" size={25} />
                <h2>{orders.length}</h2>
                <p style={styles.muted}>Total Orders</p>
              </div>

              <div style={styles.card}>
                <FileText color="#7c3aed" size={25} />
                <h2>{serviceRequests.length}</h2>
                <p style={styles.muted}>Service Requests</p>
              </div>

              <div style={styles.card}>
                <CreditCard color="#059669" size={25} />
                <h2>{payments.length}</h2>
                <p style={styles.muted}>Payment Records</p>
              </div>

              <div style={styles.card}>
                <Package color="#d97706" size={25} />
                <h2>{formatMoney(totalSpent)}</h2>
                <p style={styles.muted}>Total Order Value</p>
              </div>
            </div>

            <section style={styles.card}>
              <h3>Recent Orders</h3>

              {orders.length === 0 ? (
                <p style={styles.muted}>You haven't placed any orders yet.</p>
              ) : (
                orders.slice(0, 3).map((order) => (
                  <div
                    key={order.id}
                    style={{
                      borderTop: "1px solid #e5e9f1",
                      padding: "14px 0"
                    }}
                  >
                    <strong>Order #{order.id.slice(0, 8)}</strong>
                    <p style={styles.muted}>
                      {formatDate(order.created_at)}
                    </p>
                    <p>{formatMoney(order.total_amount)}</p>
                    <Status value={order.status} />
                  </div>
                ))
              )}

              <button
                onClick={() => setActiveTab("orders")}
                style={{
                  ...styles.button,
                  background: "#102b50",
                  color: "white",
                  marginTop: "12px"
                }}
              >
                View All Orders <ChevronRight size={15} />
              </button>
            </section>

            <section style={styles.card}>
              <h3>Recent Service Requests</h3>

              {serviceRequests.length === 0 ? (
                <p style={styles.muted}>No service requests yet.</p>
              ) : (
                serviceRequests.slice(0, 3).map((request) => (
                  <div
                    key={request.id}
                    style={{
                      borderTop: "1px solid #e5e9f1",
                      padding: "14px 0"
                    }}
                  >
                    <strong>{request.service_type}</strong>
                    <p style={styles.muted}>
                      {formatDate(request.created_at)}
                    </p>
                    <Status value={request.status} />
                  </div>
                ))
              )}

              <button
                onClick={() => setActiveTab("services")}
                style={{
                  ...styles.button,
                  background: "#102b50",
                  color: "white",
                  marginTop: "12px"
                }}
              >
                View All Requests <ChevronRight size={15} />
              </button>
            </section>
          </>
        )}

        {activeTab === "profile" && (
          <section style={styles.card}>
            <h2>My Personal Information</h2>

            <p style={styles.muted}>
              Your registered account details.
            </p>

            <div style={{ marginTop: "25px" }}>
              <p><strong>Full Name</strong></p>
              <p>{profile?.full_name || "Not available"}</p>

              <hr />

              <p><strong>Email Address</strong></p>
              <p>{user?.email}</p>

              <hr />

              <p><strong>Phone Number</strong></p>
              <p>{profile?.phone || "Not available"}</p>

              <hr />

              <p><strong>Account Type</strong></p>
              <p>Customer</p>

              <hr />

              <p><strong>Member Since</strong></p>
              <p>{formatDate(profile?.created_at)}</p>
            </div>

            <p style={styles.muted}>
              To change your password, use the Change Password section.
              Contact VINLINE LINK ENTERPRISE if your personal details
              need correction.
            </p>
          </section>
        )}

        {activeTab === "orders" && (
          <section style={styles.card}>
            <h2>My Orders</h2>

            {orders.length === 0 ? (
              <p style={styles.muted}>You have no orders yet.</p>
            ) : (
              orders.map((order) => {
                const items = orderItems.filter(
                  (item) => item.order_id === order.id
                );

                return (
                  <div
                    key={order.id}
                    style={{
                      border: "1px solid #e5e9f1",
                      borderRadius: "10px",
                      padding: "18px",
                      marginTop: "15px"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      flexWrap: "wrap"
                    }}>
                      <strong>Order #{order.id.slice(0, 8)}</strong>
                      <Status value={order.status} />
                    </div>

                    <p style={styles.muted}>
                      <Clock size={14} /> {formatDate(order.created_at)}
                    </p>

                    <h4>Items</h4>

                    {items.length === 0 ? (
                      <p style={styles.muted}>No item details available.</p>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                            padding: "7px 0"
                          }}
                        >
                          <span>
                            {item.product_name} × {item.quantity}
                          </span>
                          <strong>
                            {formatMoney(
                              Number(item.unit_price) * Number(item.quantity)
                            )}
                          </strong>
                        </div>
                      ))
                    )}

                    <hr />

                    <p>
                      Delivery: {order.delivery_method || "Not specified"}
                    </p>

                    {order.delivery_address && (
                      <p>Address: {order.delivery_address}</p>
                    )}

                    <p>
                      Delivery Fee: {formatMoney(order.delivery_fee)}
                    </p>

                    <h3>Total: {formatMoney(order.total_amount)}</h3>
                  </div>
                );
              })
            )}
          </section>
        )}

        {activeTab === "payments" && (
          <section style={styles.card}>
            <h2>Payment History</h2>

            {payments.length === 0 ? (
              <p style={styles.muted}>No payment records found.</p>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    border: "1px solid #e5e9f1",
                    padding: "16px",
                    borderRadius: "9px",
                    marginTop: "12px"
                  }}
                >
                  <strong>Order #{payment.order_id.slice(0, 8)}</strong>
                  <p>Amount: {formatMoney(payment.amount)}</p>
                  <p>
                    Method: {payment.payment_method || "Not specified"}
                  </p>
                  <p>
                    Transaction Code: {payment.transaction_code || "Not provided"}
                  </p>
                  <p style={styles.muted}>
                    {formatDate(payment.created_at)}
                  </p>
                  <Status value={payment.status} />
                </div>
              ))
            )}
          </section>
        )}

        {activeTab === "services" && (
          <section style={styles.card}>
          <h2>My Service Requests</h2>

            {serviceRequests.length === 0 ? (
              <p style={styles.muted}>
                You haven't submitted any service requests yet.
              </p>
            ) : (
              serviceRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    border: "1px solid #e5e9f1",
                    borderRadius: "10px",
                    padding: "17px",
                    marginTop: "14px"
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap"
                  }}>
                    <strong>{request.service_type}</strong>
                    <Status value={request.status} />
                  </div>

                  <p style={styles.muted}>
                    Submitted: {formatDate(request.created_at)}
                  </p>

                  <p><strong>Request Details</strong></p>
                  <p>{request.description}</p>

                  {request.document_path && (
                    <p style={styles.muted}>
                      <FileText size={15} /> PDF document attached
                    </p>
                  )}

                  <p>
                    <strong>Contact:</strong> {request.phone}
                  </p>
                </div>
              ))
            )}

            <Link
              to="/service-request"
              style={{
                ...styles.button,
                background: "#102b50",
                color: "white",
                textDecoration: "none",
                display: "inline-block",
                marginTop: "20px"
              }}
            >
              Submit Another Request
            </Link>
          </section>
        )}

        {activeTab === "password" && (
          <section style={styles.card}>
            <h2>Change Password</h2>

            <p style={styles.muted}>
              Choose a new password with at least 8 characters.
            </p>

            <form
              onSubmit={handlePasswordChange}
              style={{ maxWidth: "450px", marginTop: "20px" }}
            >
              <label>New Password</label>
              <input
                type="password"
                style={styles.input}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />

              <label>Confirm New Password</label>
              <input
                type="password"
                style={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />

              {passwordError && (
                <p style={{ color: "#dc2626" }}>{passwordError}</p>
              )}

              {passwordMessage && (
                <p style={{ color: "#15803d" }}>{passwordMessage}</p>
              )}

              <button
                type="submit"
                disabled={changingPassword}
                style={{
                  ...styles.button,
                  background: "#102b50",
                  color: "white"
                }}
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </section>
        )}

        <footer style={{
          textAlign: "center",
          color: "#64748b",
          padding: "25px 10px",
          fontSize: "13px"
        }}>
          VINLINE LINK ENTERPRISE
          <br />
          LINKING POSSIBILITIES, CREATING VALUE.
        </footer>

      </div>
    </div>
  );
}