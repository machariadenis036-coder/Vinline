import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import { User, Mail, Lock, Phone } from "lucide-react";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("Your password must have at least 8 characters.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        "Registration submitted! Check your email for a confirmation link before signing in."
      );
    }

    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img
          src="/vinline-logo.png"
          alt="VINLINE LINK ENTERPRISE"
          className="login-logo"
        />

        <h1>Create Account</h1>
        <p>Register to shop and request our services.</p>

        <form onSubmit={handleRegister}>
          <label>Full Name</label>
          <div className="login-input">
            <User size={18} />
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          <label>Phone Number</label>
          <div className="login-input">
            <Phone size={18} />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              required
            />
          </div>

          <label>Email Address</label>
          <div className="login-input">
            <Mail size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <label>Password</label>
          <div className="login-input">
            <Lock size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}
          {message && <p className="register-success">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="register-login">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>

        <Link to="/">Back to Website</Link>
      </div>
    </div>
  );
}