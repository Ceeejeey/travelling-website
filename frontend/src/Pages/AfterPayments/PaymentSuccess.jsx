import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Success = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false); // ✅ Email sending state

  const query = new URLSearchParams(location.search);
  const orderId = query.get('orderId');

  // Fetch CSRF token
  useEffect(() => {
    const fetchCsrf = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/payments/csrf-token`, {
          withCredentials: true,
        });
        setCsrfToken(res.data.csrfToken);
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
      }
    };
    fetchCsrf();
  }, []);

  // Fetch payment details
  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/after-payments/${orderId}`, {
          withCredentials: true,
        });
        setPayment(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch payment details');
        setLoading(false);
      }
    };
    if (orderId) fetchPayment();
    else setError('No order ID provided');
  }, [orderId]);

  // Handle email receipt
  const handleEmailReceipt = async () => {
    try {
      setSendingEmail(true); // change button text
      await axios.post(
        `${backendUrl}/api/after-payments/${orderId}/email-receipt`,
        {},
        {
          withCredentials: true,
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      toast.success('📧 Receipt sent to your email!');
    } catch (err) {
      toast.error('❌ Failed to send email receipt');
      console.error('Email receipt error:', err);
    } finally {
      setSendingEmail(false); // reset button text
    }
  };

  // Handle download receipt
  const handleDownloadReceipt = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/after-payments/${orderId}/download-receipt`, {
        withCredentials: true,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('📄 Receipt downloaded successfully!');
    } catch (err) {
      toast.error('❌ Failed to download receipt');
    }
  };

  const clearSessionData = async () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=ceejeey.me; secure; SameSite=None';
      document.cookie = '_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=ceejeey.me; secure; SameSite=None';

      await axios.post(`${backendUrl}/api/logout`, {}, { withCredentials: true });
      console.log('Session data cleared');
    } catch (err) {
      console.error('Error clearing session data:', err);
    }
  };

  useEffect(() => {
    return () => {
      clearSessionData();
    };
  }, []);

  const handleReturnToHome = async () => {
    await clearSessionData();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100">
        <p className="text-lg text-emerald-700 animate-pulse">Fetching payment details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 p-6 pt-30">
      <Toaster position="top-right" />
      <div className="bg-white/90 backdrop-blur-xl p-10 rounded-2xl shadow-2xl border border-green-200 max-w-lg w-full space-y-8 animate-fade-in">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="bg-emerald-100 p-4 rounded-full">
            <svg className="w-16 h-16 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Success Text */}
        <h1 className="text-3xl font-bold text-center text-emerald-700">
          Payment Successful 🎉
        </h1>
        <p className="text-center text-gray-600">
          Thank you for booking your Sri Lankan adventure with us 🌴🐘 <br />
          Your payment for <span className="font-semibold text-emerald-700">{payment?.customer.tripName}</span> is confirmed!
        </p>

        {/* Payment Details Card */}
        <div className="bg-emerald-50 rounded-xl p-6 shadow-inner text-gray-700 space-y-2">
          <p><strong>Order ID:</strong> {payment?.order_id}</p>
          <p><strong>Payment Type:</strong> {payment?.paymentType}</p>
          <p><strong>Amount:</strong> {payment?.currency} {payment?.amount}</p>
          <p><strong>Email:</strong> {payment?.customer.email}</p>
          <p><strong>Name:</strong> {payment?.customer.first_name} {payment?.customer.last_name}</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col space-y-4">
          <button
            onClick={handleEmailReceipt}
            disabled={!csrfToken || sendingEmail}
            className="bg-emerald-600 text-white px-6 py-3 rounded-full font-semibold shadow hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
          >
            {sendingEmail ? "Sending..." : "📧 Email Receipt"}
          </button>
          <button
            onClick={handleDownloadReceipt}
            className="bg-teal-600 text-white px-6 py-3 rounded-full font-semibold shadow hover:bg-teal-700 transition cursor-pointer"
          >
            📄 Download Receipt
          </button>
          <button
            onClick={handleReturnToHome}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-full font-semibold shadow hover:from-emerald-700 hover:to-teal-700 transition cursor-pointer"
          >
            🏡 Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Success;
