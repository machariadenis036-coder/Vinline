import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft } from "lucide-react";

export default function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("vinline-cart") || "[]");
    setCartItems(savedCart);
  }, []);

  function updateCart(items) {
    setCartItems(items);
    localStorage.setItem("vinline-cart", JSON.stringify(items));
  }

  function changeQuantity(id, amount) {
    const updated = cartItems
      .map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity + amount }
          : item
      )
      .filter((item) => item.quantity > 0);

    updateCart(updated);
  }

  function removeItem(id) {
    updateCart(cartItems.filter((item) => item.id !== id));
  }

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  return (
    <div className="cart-page">
      <div className="cart-container">
        <Link to="/" className="cart-back">
          <ArrowLeft size={18} /> Continue Shopping
        </Link>

        <h1><ShoppingCart /> Your Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <ShoppingCart size={55} />
            <h2>Your cart is empty</h2>
            <p>Browse our bookshop and add products to your cart.</p>
            <Link to="/">Explore Bookshop</Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map((item) => (
                <div className="cart-item" key={item.id}>
                  <img
                    src={item.image_url || "/vinline-logo.png"}
                    alt={item.name}
                  />

                  <div className="cart-item-details">
                    <h3>{item.name}</h3>
                    <p>KES {Number(item.price).toLocaleString()}</p>

                    <div className="quantity-controls">
                      <button onClick={() => changeQuantity(item.id, -1)}>
                        <Minus size={15} />
                      </button>

                      <span>{item.quantity}</span>

                      <button onClick={() => changeQuantity(item.id, 1)}>
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>

                  <button
                    className="remove-item"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove product"
                  >
                    <Trash2 size={19} />
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h2>Order Summary</h2>
              <div className="cart-total">
                <span>Total</span>
                <strong>KES {total.toLocaleString()}</strong>
              </div>

              <button
                className="checkout-button"
                onClick={() => navigate("/checkout")}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}