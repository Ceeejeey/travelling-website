import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import Payment from '../schema/PaymentSchema.js';
import { google } from 'googleapis';

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const createTransporter = async () => {
  const accessToken = await oAuth2Client.getAccessToken();

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken: accessToken.token,
    },
  });
};

// Get booking details
const getBooking = async (req, res) => {
  try {
    console.log('Fetching booking details for order ID:', req.params.orderId);
    const payment = await Payment.findOne({ order_id: req.params.orderId });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    console.error('Error fetching payment:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Email receipt
const sendEmailReceipt = async (req, res) => {
  try {
    const payment = await Payment.findOne({ order_id: req.params.orderId });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const transporter = await createTransporter();

    const mailOptions = {
      from: `Modern Travellers Lanka <${process.env.EMAIL_USER}>`,
      to: payment.customer.email,
      subject: `Payment Confirmation - ${payment.order_id}`,
      html: `
        <h2>Payment Confirmation</h2>
        <p>Thank you for your payment!</p>
        <p><strong>Order ID:</strong> ${payment.order_id}</p>
        <p><strong>Payment Type:</strong> ${payment.paymentType}</p>
        <p><strong>Trip Name:</strong> ${payment.customer.tripName}</p>
        <p><strong>Amount:</strong> ${payment.currency} ${payment.amount}</p>
        <p><strong>Name:</strong> ${payment.customer.first_name} ${payment.customer.last_name}</p>
        <p><strong>Email:</strong> ${payment.customer.email}</p>
        <p><strong>Phone:</strong> ${payment.customer.phone}</p>
        <p><strong>Date:</strong> ${new Date(payment.created_at).toLocaleDateString()}</p>
        <p>We look forward to serving you!</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent via Gmail API' });
  } catch (err) {
    console.error('Error sending Gmail receipt:', err);
    res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
};

// Download receipt


const downloadReceipt = async (req, res) => {
  try {
    const payment = await Payment.findOne({ order_id: req.params.orderId });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    console.log('Generating PDF for order ID:', payment);
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${payment.order_id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${payment.order_id}`);
    doc.text(`Payment Type: ${payment.paymentType}`);
    doc.text(`Trip Name: ${payment.customer.tripName}`);
    doc.text(`Amount: ${payment.currency} ${payment.amount}`);
    doc.text(`Name: ${payment.customer.first_name} ${payment.customer.last_name}`);
    doc.text(`Email: ${payment.customer.email}`);
    doc.text(`Phone: ${payment.customer.phone}`);
    doc.text(`Date: ${new Date(payment.created_at).toLocaleDateString()}`);
    doc.end();
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

export { getBooking, sendEmailReceipt, downloadReceipt };