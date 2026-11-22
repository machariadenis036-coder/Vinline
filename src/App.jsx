import {
  Menu,
  X,
  User,
  BookOpen,
  Printer,
  GraduationCap,
  FileText,
  ArrowRight,
  MapPin,
  Clock,
  Mail,
  Phone,
  ShoppingBag,
  CheckCircle
} from "lucide-react";

import { useState, useEffect } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Link
} from "react-router-dom";

import { supabase } from "./lib/supabase";
import Login from "./pages/login.jsx";
import AdminDashboard from "./admin/adminDashboard.jsx";
import Register from "./pages/Register.jsx";
import Checkout from "./pages/checkout.jsx";
import CustomerLogin from "./pages/customerlogin.jsx";
import Cart from "./pages/cart.jsx";
import ServiceRequest from "./pages/servicerequest.jsx";
import CustomerDashboard from "./pages/customerdashboard.jsx";

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");
 

  const [cartCount, setCartCount] = useState(() => {
    const saved = JSON.parse(
      localStorage.getItem("vinline-cart") || "[]"
    );

    return saved.reduce(
      (total, item) => total + item.quantity,
      0
    );
  });
   const [customer, setCustomer] = useState(null);

useEffect(() => {
  let mounted = true;

  async function checkCustomer() {
    const { data } = await supabase.auth.getUser();

    if (mounted) {
      setCustomer(data.user || null);
    }
  }

  checkCustomer();

  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (mounted) {
      setCustomer(session?.user || null);
    }
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);

  function addToCart(product) {
    const cart = JSON.parse(
      localStorage.getItem("vinline-cart") || "[]"
    );

    const existing = cart.find(
      (item) => item.id === product.id
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem(
      "vinline-cart",
      JSON.stringify(cart)
    );

    setCartCount(
      cart.reduce(
        (total, item) => total + item.quantity,
        0
      )
    );

    alert(`${product.name} added to your cart!`);
  }

  const services = [
    {
      icon: GraduationCap,
      title: "Student Services",
      description:
        "HELB assistance, KUCCPS guidance, university and college applications."
    },
    {
      icon: Printer,
      title: "Printing & Photocopying",
      description:
        "Professional document printing, photocopying and scanning services."
    },
    {
      icon: FileText,
      title: "CV & Document Services",
      description:
        "Professional CV preparation, typing, editing and document formatting."
    },
    {
      icon: BookOpen,
      title: "Government Services",
      description:
        "KRA, SHA registration assistance and other online government services."
    }
  ];

  useEffect(() => {
    async function fetchProducts() {
      setLoadingProducts(true);
      setProductError("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Product loading error:", error);
        setProductError(
          "Unable to load products. Please try again later."
        );
      } else {
        setProducts(data || []);
      }

      setLoadingProducts(false);
    }

    fetchProducts();
  }, []);

  return (
    <div className="site">

      <div className="topbar">
        <span>LINKING POSSIBILITIES, CREATING VALUE.</span>
        <span>Runyenjes – Kiangungi</span>
      </div>

      <header className="header">

        <a href="#home" className="brand">
          <img
            src="/vinline-logo-org.jpeg"
            alt="VINLINE LINK ENTERPRISE"
          />

          <div>
            <strong>VINLINE LINK</strong>
            <small>ENTERPRISE</small>
          </div>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav
          className={
            menuOpen
              ? "navigation open"
              : "navigation"
          }
        >
          <a
            href="#home"
            onClick={() => setMenuOpen(false)}
          >
            Home
          </a>

          <a
            href="#services"
            onClick={() => setMenuOpen(false)}
          >
            Cyber Services
          </a>

          <a
            href="#bookshop"
            onClick={() => setMenuOpen(false)}
          >
            Bookshop
          </a>

          <a
            href="#about"
            onClick={() => setMenuOpen(false)}
          >
            About Us
          </a>

          <a
            href="#contact"
            onClick={() => setMenuOpen(false)}
          >
            Contact
          </a>
        </nav>

        <div className="header-actions">

  <Link to="/cart" className="cart-link">
    <ShoppingBag size={19} />
    Cart ({cartCount})
  </Link>

  {customer ? (
    <Link to="/my-account" className="header-button">
      <User size={17} />
      My Account
    </Link>
  ) : (
    <>
      <Link to="/customer-login" className="header-button">
        Customer Login
      </Link>

      <Link to="/register" className="header-button">
        Register
      </Link>
    </>
  )}

  <a href="#contact" className="header-button">
    Get in Touch <ArrowRight size={17} />
  </a>

</div>

      </header>

      <main>

        <section className="hero" id="home">

          <div className="hero-content">

            <span className="eyebrow">
              YOUR TRUSTED DIGITAL & BOOKSHOP PARTNER
            </span>

            <h1>
              Linking You to
              <span> Possibilities.</span>
            </h1>

            <p>
              Welcome to VINLINE LINK ENTERPRISE. Your reliable destination
              for cyber café services, educational assistance, document
              solutions and quality bookshop products.
            </p>

            <div className="hero-actions">

              <a
                href="#services"
                className="primary-button"
              >
                Explore Our Services
                <ArrowRight size={18} />
              </a>

              <a
                href="#bookshop"
                className="secondary-button"
              >
                Visit Bookshop
              </a>

            </div>

            <div className="hero-trust">
              <CheckCircle size={18} />
              <span>
                Convenient services. Reliable assistance. Great value.
              </span>
            </div>

          </div>

          <div className="hero-image">

            <img
              src="/vinline-logo-org.jpeg"
              alt="VINLINE LINK ENTERPRISE official logo"
            />

            <div className="image-caption">
              <strong>VINLINE LINK ENTERPRISE</strong>
              <span>
                Linking Possibilities, Creating Value.
              </span>
            </div>

          </div>

        </section>

        <section className="intro-strip">

          <div>
            <span>01</span>
            <strong>Cyber Café</strong>
            <small>Digital and document solutions</small>
          </div>

          <div>
            <span>02</span>
            <strong>Bookshop</strong>
            <small>Books and stationery</small>
          </div>

          <div>
            <span>03</span>
            <strong>Online Assistance</strong>
            <small>Convenient customer support</small>
          </div>

        </section>

        <section
          className="section services"
          id="services"
        >

          <div className="section-heading">

            <span className="eyebrow">
              WHAT WE OFFER
            </span>

            <h2>Our Cyber Café Services</h2>

            <p>
              Professional assistance designed to make your everyday
              digital and academic tasks easier.
            </p>

          </div>

          <div className="service-grid">

            {services.map((service, index) => {
              const Icon = service.icon;

              return (
                <article
                  className="service-card"
                  key={index}
                >

                  <div className="service-icon">
                    <Icon size={28} />
                  </div>

                  <h3>{service.title}</h3>

                  <p>{service.description}</p>

                  <a href="#contact">
                    Enquire now
                    <ArrowRight size={16} />
                  </a>

                </article>
              );
            })}

          </div>

        </section>

        <section
          className="section"
          id="bookshop"
        >

          <div className="section-heading">

            <span className="eyebrow">
              LEARN. GROW. ACHIEVE.
            </span>

            <h2>Our Bookshop</h2>

            <p>
              Explore educational materials, stationery and other
              essential supplies from VINLINE LINK ENTERPRISE.
            </p>

          </div>

          {loadingProducts && (
            <p className="product-message">
              Loading our products...
            </p>
          )}

          {productError && (
            <p className="product-message">
              {productError}
            </p>
          )}

          {!loadingProducts &&
            !productError &&
            products.length === 0 && (
              <div className="product-message">
                <BookOpen size={45} />
                <h3>Our products are coming soon!</h3>
                <p>
                  We are preparing our bookshop catalogue for you.
                </p>
              </div>
            )}

          {!loadingProducts &&
            products.length > 0 && (
              <div className="product-grid">

                {products.map((product) => (
                  <article
                    className="product-card"
                    key={product.id}
                  >

                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                      />
                    )}

                    <div className="product-info">

                      <h3>{product.name}</h3>

                      <p>{product.description}</p>

                      <strong className="product-price">
                        KSh{" "}
                        {Number(product.price).toLocaleString("en-KE")}
                      </strong>

                      <button
                        className="add-to-cart-button"
                        onClick={() => addToCart(product)}
                      >
                        <ShoppingBag size={17} />
                        Add to Cart
                      </button>

                    </div>

                  </article>
                ))}

              </div>
            )}

        </section>

        <section className="bookshop-section">

          <div className="bookshop-content">

            <span className="eyebrow">
              LEARN. GROW. ACHIEVE.
            </span>

            <h2>
              Your Bookshop, Your Learning Partner.
            </h2>

            <p>
              Discover books, stationery and essential learning supplies.
              Our online ordering system is being prepared.
            </p>

            <a
              href="#contact"
              className="primary-button"
            >
              Enquire About Products
              <ArrowRight size={18} />
            </a>

          </div>

          <div className="bookshop-icon">
            <BookOpen size={100} strokeWidth={1.2} />
            <ShoppingBag size={55} />
          </div>

        </section>

        <section
          className="section about"
          id="about"
        >

          <div className="section-heading">

            <span className="eyebrow">
              ABOUT OUR BUSINESS
            </span>

            <h2>
              Linking Possibilities, Creating Value.
            </h2>

            <p>
              VINLINE LINK ENTERPRISE brings together cyber café
              solutions and bookshop services to serve individuals,
              students and the wider community.
            </p>

          </div>

        </section>
        <section className="section services" id="delivery">
  <div className="section-heading">
    <span className="eyebrow">FAST & CONVENIENT DELIVERY</span>
    <h2>Our Delivery Charges</h2>
    <p>
      Get your bookshop orders delivered conveniently.
      Delivery charges depend on the approximate distance
      from our shop in Runyenjes – Kiangungi.
    </p>
  </div>

  <div className="service-grid">
    {[
      { distance: "2 KM", price: 50 },
      { distance: "5 KM", price: 100 },
      { distance: "10 KM", price: 150 },
      { distance: "15 KM", price: 200 },
      { distance: "25 KM", price: 300 },
      { distance: "40 KM", price: 450 }
    ].map((item) => (
      <article className="service-card" key={item.distance}>
        <div className="service-icon">
          <MapPin size={28} />
        </div>
        <h3>{item.distance}</h3>
        <p>Delivery charge</p>
        <strong className="product-price">
          KSh {item.price}
        </strong>
      </article>
    ))}
  </div>

  <p className="product-message">
    Collecting your order directly from our shop?
    No delivery charges apply.
  </p>
</section>

        <section
          className="contact-section"
          id="contact"
        >

          <div>

            <span className="eyebrow">
              WE ARE HERE TO HELP
            </span>

            <h2>Let's Connect.</h2>

            <p>
              Need assistance with a service or looking for a
              bookshop product? Get in touch with us.
            </p>

          </div>

          <div className="contact-details">

            <div>
              <MapPin />
              <a
                href="https://maps.app.goo.gl/m1yDVkfEbV5nfT71A"
                target="_blank"
                rel="noopener noreferrer"
              >
                Runyenjes – Kiangungi, Embu, Kenya
              </a>
            </div>

            <div>
              <Clock />
              <span>
                Monday – Saturday, 8:00 AM – 5:00 PM
              </span>
            </div>

            <div>
              <Mail />
              <a href="mailto:machariadenis036@gmail.com">
                machariadenis036@gmail.com
              </a>
            </div>

            <div>
              <Phone />
              <a
                href="https://wa.me/254117244681"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp: 0117244681
              </a>
            </div>

            <a
              href="https://maps.app.goo.gl/m1yDVkfEbV5nfT71A"
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button"
            >
              <MapPin size={18} />
              Get Directions
              <ArrowRight size={18} />
            </a>

          </div>

        </section>

      </main>

      <footer className="footer">

        <div className="footer-brand">

          <img
            src="/vinline-logo-org.jpeg"
            alt="VINLINE LINK logo"
          />

          <div>
            <strong>VINLINE LINK ENTERPRISE</strong>
            <small>
              LINKING POSSIBILITIES, CREATING VALUE.
            </small>
          </div>

        </div>

        <p>
          © {new Date().getFullYear()} VINLINE LINK ENTERPRISE.
          All rights reserved.
        </p>

      </footer>

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/customer-login"
          element={<CustomerLogin />}
        />

        <Route path="/cart" element={<Cart />} />

        <Route path="/checkout" element={<Checkout />} />

        <Route
           path="/service-request"
           element={<ServiceRequest />}
        />

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />
        <Route
         path="/my-account"
         element={<CustomerDashboard />}
       />

      </Routes>

    </BrowserRouter>
  );
}