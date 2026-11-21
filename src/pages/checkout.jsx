import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  ArrowLeft,
  MapPin,
  CreditCard,
  Loader2,
  CheckCircle,
  Phone
} from "lucide-react";
import { supabase } from "../lib/supabase";

const deliveryPrices = {
  2: 50,
  5: 100,
  10: 150,
  15: 200,
  25: 300,
  40: 450
};

export default function Checkout() {
  const navigate = useNavigate();

  const [cart, setCart] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [deliveryDistance, setDeliveryDistance] = useState("");

  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    location: ""
  });

  const [transactionCode, setTransactionCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedCart = JSON.parse(
      localStorage.getItem("vinline-cart") || "[]"
    );

    setCart(savedCart);
  }, []);

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + Number(item.price) * Number(item.quantity),
    0
  );

  const deliveryFee =
    deliveryMethod === "delivery" && deliveryDistance
      ? deliveryPrices[deliveryDistance] || 0
      : 0;

  const grandTotal = subtotal + deliveryFee;

  function handleChange(e) {
    setCustomer({
      ...customer,
      [e.target.name]: e.target.value
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!transactionCode.trim()) {
      alert("Please enter your M-Pesa transaction code.");
      return;
    }

    if (
      deliveryMethod === "delivery" &&
      (!customer.location.trim() || !deliveryDistance)
    ) {
      alert("Please enter your delivery location and select a distance.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        alert("Please log in to submit your order.");
        navigate("/customer-login");
        return;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          customer_name: customer.name.trim(),
          customer_phone: customer.phone.trim(),
          customer_email: customer.email.trim(),
          total_amount: grandTotal,
          delivery_method: deliveryMethod,
          delivery_address:
            deliveryMethod === "delivery"
              ? customer.location.trim()
              : null,
          delivery_fee: deliveryFee,
          status: "pending"
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Save order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.id || null,
        product_name: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.price)
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Order items error:", itemsError);

        throw new Error(
          "Your order was created, but the products could not be saved. Reference: " +
          order.id
        );
      }

      // Save M-Pesa payment
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: order.id,
          amount: grandTotal,
          payment_method: "M-Pesa",
          transaction_code: transactionCode.trim().toUpperCase(),
          status: "pending"
        });

      if (paymentError) {
        console.error("Payment record error:", paymentError);

        throw new Error(
          "Your order was created, but payment details could not be saved. Please contact the shop. Reference: " +
          order.id
        );
      }

      // Clear cart after successful submission
      localStorage.removeItem("vinline-cart");
      setCart([]);

      alert(
        "Your order has been submitted successfully! Your M-Pesa payment is awaiting verification by VINLINE LINK ENTERPRISE. Order reference: " +
        order.id
      );

      navigate("/");
    } catch (error) {
      console.error("Checkout error:", error);
      alert(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <h2>Your cart is empty</h2>
          <Link to="/">Return to Bookshop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">

        <Link to="/cart" className="checkout-back">
          <ArrowLeft size={18} />
          Back to Cart
        </Link>

        <h1>Checkout</h1>
        <p>Complete your details to place your order.</p>

        <div className="checkout-layout">

          <form
            onSubmit={handleSubmit}
            className="checkout-form"
          >
            <h2>Customer Details</h2>

            <label>Full Name</label>
            <input
              name="name"
              value={customer.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />

            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={customer.phone}
              onChange={handleChange}
              placeholder="07XXXXXXXX"
              required
            />

            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={customer.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />

            <h2>Delivery Method</h2>

            <label className="delivery-option">
              <input
                type="radio"
                name="delivery"
                checked={deliveryMethod === "pickup"}
                onChange={() => {
                  setDeliveryMethod("pickup");
                  setDeliveryDistance("");
                }}
              />
              Shop Pickup — Free
            </label>

            <label className="delivery-option">
              <input
                type="radio"
                name="delivery"
                checked={deliveryMethod === "delivery"}
                onChange={() => setDeliveryMethod("delivery")}
              />
              Home/Office Delivery
            </label>

            {deliveryMethod === "delivery" && (
              <>
                <label>Delivery Location</label>

                <textarea
                  name="location"
                  value={customer.location}
                  onChange={handleChange}
                  placeholder="Enter your area, estate or nearest landmark"
                  required
                />

                <label>Select Approximate Distance</label>

                <select
                  value={deliveryDistance}
                  onChange={(e) =>
                    setDeliveryDistance(e.target.value)
                  }
                  required
                >
                  <option value="">Select delivery distance</option>

                  {Object.entries(deliveryPrices).map(
                    ([distance, fee]) => (
                      <option key={distance} value={distance}>
                        {distance} km — KSh {fee}
                      </option>
                    )
                  )}
                </select>

                <p className="delivery-note">
                  Delivery charges are based on approximate distance
                  from our shop.
                </p>
              </>
            )}

            <h2>M-Pesa Payment</h2>

            <div className="payment-instructions">
              <CreditCard size={24} />

              <div>
                <strong>M-Pesa Payment Instructions</strong>

                <p>
                  Pay to VINLINE LINK ENTERPRISE using the
                  number below:
                </p>

                <h3 className="mpesa-number">
                  <Phone size={19} />
                  0117244681
                </h3>

                <p>
                  After making payment, enter your M-Pesa
                  transaction code below.
                </p>
              </div>
            </div>

            <label>M-Pesa Transaction Code</label>

            <input
              value={transactionCode}
              onChange={(e) =>
                setTransactionCode(e.target.value.toUpperCase())
              }
              placeholder="e.g. QWE123ABC"
              required
            />

            <p className="delivery-note">
              Your payment will remain pending until the shop
              manually verifies it.
            </p>

            <button
              type="submit"
              className="checkout-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} />
                  Submitting Order...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Submit Order
                </>
              )}
            </button>
          </form>

          <div className="checkout-summary">
            <h2>
              <ShoppingBag size={20} />
              Order Summary
            </h2>

            {cart.map((item) => (
              <div className="checkout-item" key={item.id}>
                <span>
                  {item.name} × {item.quantity}
                </span>

                <strong>
                  KSh {(
                    Number(item.price) * Number(item.quantity)
                  ).toLocaleString("en-KE")}
                </strong>
              </div>
            ))}

            <div className="checkout-total">
              <span>Subtotal</span>
              <strong>
                KSh {subtotal.toLocaleString("en-KE")}
              </strong>
            </div>

            <div className="checkout-total">
              <span>Delivery Fee</span>
              <strong>
                {deliveryMethod === "pickup"
                  ? "Free"
                  : `KSh ${deliveryFee.toLocaleString("en-KE")}`}
              </strong>
            </div>

            <div className="checkout-grand-total">
              <span>Grand Total</span>
              <strong>
                KSh {grandTotal.toLocaleString("en-KE")}
              </strong>
            </div>

            <p className="delivery-note">
              <MapPin size={15} />
              Pickup is available at VINLINE LINK ENTERPRISE,
              Runyenjes – Kiangungi.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}