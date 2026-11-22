import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  FileText,
  Upload,
  Send,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import "./servicerequest.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const serviceOptions = [
  "HELB Assistance",
  "KUCCPS Assistance",
  "University Application",
  "College Application",
  "KRA Services",
  "SHA Registration",
  "CV Writing",
  "Document Printing",
  "Typing and Photocopying",
  "Scanning Services",
  "Other Services"
];

export default function ServiceRequest() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    service_type: "",
    description: ""
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      const { data, error } = await supabase.auth.getUser();

      if (mounted) {
        setUser(error ? null : data.user);
        setCheckingAuth(false);
      }
    }

    checkUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUser(session?.user || null);
          setCheckingAuth(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  function handleFileChange(e) {
    setMessage("");
    setSuccess(false);

    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      selectedFile.type !== "application/pdf" ||
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null);
      e.target.value = "";
      setMessage("Please select a valid PDF document.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      e.target.value = "";
      setMessage("Your PDF must not exceed 10MB.");
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    if (!user) {
      setMessage("Please log in before submitting a request.");
      return;
    }

    if (!form.customer_name.trim() || !form.phone.trim() ||
        !form.service_type || !form.description.trim()) {
      setMessage("Please complete all required fields.");
      return;
    }

    setLoading(true);

    let uploadedPath = null;

    try {
      if (file) {
        const safeName = file.name
          .replace(/[^a-zA-Z0-9._-]/g, "_");

        uploadedPath =
          `${user.id}/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("customer-document")
          .upload(uploadedPath, file, {
            contentType: "application/pdf",
            upsert: false
          });

        if (uploadError) {
          throw new Error(
            "PDF upload failed: " + uploadError.message
          );
        }
      }

      const { error: insertError } = await supabase
        .from("service_requests")
        .insert({
          user_id: user.id,
          customer_name: form.customer_name.trim(),
          phone: form.phone.trim(),
          service_type: form.service_type,
          description: form.description.trim(),
          document_path: uploadedPath,
          status: "pending"
        });

      if (insertError) {
        throw new Error(
          "Request submission failed: " + insertError.message
        );
      }

      setSuccess(true);
      setMessage(
        "Your service request has been submitted successfully!"
      );

      setForm({
        customer_name: "",
        phone: "",
        service_type: "",
        description: ""
      });

      setFile(null);

      const fileInput = document.getElementById("service-pdf");
      if (fileInput) fileInput.value = "";

    } catch (error) {
      console.error("Service request error:", error);

      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from("customer-document")
          .remove([uploadedPath]);

        if (cleanupError) {
          console.error("Uploaded file cleanup failed:", cleanupError);
        }
      }

      setMessage(error.message || "Something went wrong. Please try again.");

    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="request-page">
        <p>Checking your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="request-page">
        <div className="request-card auth-required">
          <AlertCircle size={45} />
          <h2>Login Required</h2>
          <p>
            Please log in to your customer account before
            submitting a service request.
          </p>
          <Link to="/customer-login" className="request-button">
            Customer Login
          </Link>
          <Link to="/register" className="back-link">
            Don't have an account? Register
          </Link>
          <Link to="/" className="back-link">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="request-page">
      <div className="request-container">

        <Link to="/" className="back-link">
          <ArrowLeft size={17} /> Back to Home
        </Link>

        <div className="request-heading">
          <span className="request-eyebrow">
            VINLINE LINK ENTERPRISE
          </span>

          <h1>Request a Service</h1>

          <p>
            Tell us what you need. Our team will receive
            your request and assist you.
          </p>
        </div>

        <form
          className="request-card"
          onSubmit={handleSubmit}
        >
          <div className="request-section-title">
            <FileText size={21} />
            <h2>Customer Information</h2>
          </div>

          <label htmlFor="customer_name">
            Full Name *
          </label>

          <input
            id="customer_name"
            name="customer_name"
            type="text"
            placeholder="Enter your full name"
            value={form.customer_name}
            onChange={handleChange}
            required
          />

          <label htmlFor="phone">
            Phone Number *
          </label>

          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Enter your phone number"
            value={form.phone}
            onChange={handleChange}
            required
          />

          <div className="request-divider" />

          <div className="request-section-title">
            <FileText size={21} />
            <h2>Service Details</h2>
          </div>

          <label htmlFor="service_type">
            Select Service *
          </label>

          <select
            id="service_type"
            name="service_type"
            value={form.service_type}
            onChange={handleChange}
            required
          >
            <option value="">Choose a service</option>

            {serviceOptions.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>

          <label htmlFor="description">
            Describe Your Request *
          </label>

          <textarea
            id="description"
            name="description"
            rows="5"
            placeholder="Explain what assistance you need..."
            value={form.description}
            onChange={handleChange}
            required
          />

          <div className="request-divider" />

          <div className="request-section-title">
            <Upload size={21} />
            <h2>Attach Documents</h2>
          </div>

          <p className="upload-help">
            Upload a PDF document if your request requires one.
            This is optional. Maximum size: 10MB.
          </p>

          <label htmlFor="service-pdf" className="upload-area">
            <Upload size={30} />
            <strong>
              {file ? file.name : "Choose PDF Document"}
            </strong>
            <span>PDF files only</span>

            <input
              id="service-pdf"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
            />
          </label>

          {message && (
            <div
              className={
                success
                  ? "request-message success"
                  : "request-message error"
              }
            >
              {success
                ? <CheckCircle size={19} />
                : <AlertCircle size={19} />}
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            className="request-button submit-request"
            disabled={loading}
          >
            {loading ? (
              "Submitting..."
            ) : (
              <>
                Submit Service Request
                <Send size={18} />
              </>
            )}
          </button>

          <p className="request-footer">
            Your submitted request will be sent securely
            to VINLINE LINK ENTERPRISE.
          </p>
        </form>

      </div>
    </div>
  );
}