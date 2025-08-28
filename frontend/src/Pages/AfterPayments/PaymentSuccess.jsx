import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Success = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);

  // Extract orderId from URL query
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
      await axios.post(
        `${backendUrl}/api/after-payments/${orderId}/email-receipt`,
        {},
        {
          withCredentials: true,
          headers: {
            'X-CSRF-Token': csrfToken, // ✅ include CSRF token
          },
        }
      );
      alert('Receipt sent to your email!');
    } catch (err) {
      alert('Failed to send email receipt');
      console.error('Email receipt error:', err);
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
    } catch (err) {
      alert('Failed to download receipt');
    }
  };

  // Clear session/localStorage/cookies
  const clearSessionData = async () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=ceejeey.me; secure; SameSite=None';
      document.cookie = '_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=ceejeey.me; secure; SameSite=None';

      await axios.post(`${backendUrl}/api/logout`, {}, { withCredentials: true });
      console.log('Session data, storage, and cookies cleared');
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-green-100 p-8 rounded-xl shadow-md shadow-green-800 border border-green-200 max-w-sm w-full space-y-6 animate-fade-in">
        <div className="flex justify-center">
          <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-800 text-center">
          Payment Successful
        </h1>
        <p className="text-sm text-gray-600 text-center">
          Your payment for {payment?.customer.tripName} is confirmed!
        </p>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Order ID:</strong> {payment?.order_id}</p>
          <p><strong>Payment Type:</strong> {payment?.paymentType}</p>
          <p><strong>Amount:</strong> {payment?.currency} {payment?.amount}</p>
          <p><strong>Email:</strong> {payment?.customer.email}</p>
          <p><strong>Name:</strong> {payment?.customer.first_name} {payment?.customer.last_name}</p>
        </div>
        <div className="flex flex-col space-y-4">
          <button
            onClick={handleEmailReceipt}
            disabled={!csrfToken} // prevent sending without CSRF
            className="bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 transition text-sm font-medium disabled:opacity-50"
          >
            Email Receipt
          </button>
          <button
            onClick={handleDownloadReceipt}
            className="bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 transition text-sm font-medium"
          >
            Download Receipt
          </button>
          <button
            onClick={handleReturnToHome}
            className="bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 transition text-sm font-medium"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Success;
