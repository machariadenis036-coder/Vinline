import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn } from "lucide-react";

export default function CustomerLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || profile?.role !== "customer") {
      await supabase.auth.signOut();
      setError("This login is for customer accounts only.");
      setLoading(false);
      return;
    }

    navigate("/my-account");
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img
          src="/vinline-logo.png"
          alt="VINLINE LINK ENTERPRISE"
          className="login-logo"
        />

        <h1>Customer Login</h1>
        <p>Sign in to continue shopping and request our services.</p>

        <form onSubmit={handleLogin}>
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
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading}>
            <LogIn size={18} />
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>

        <Link to="/">Back to Website</Link>
      </div>
    </div>
  );
}