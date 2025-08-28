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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #D1FAE5; border-radius: 15px; background-color: #F0FDF4;">
          <h2 style="color:#047857; text-align:center; border-bottom: 2px solid #047857; padding-bottom: 10px;">Payment Receipt</h2>

          <p style="font-size:14px;">Hello <strong>${payment.customer.first_name}</strong>,</p>
          <p style="font-size:14px;">Thank you for booking your adventure with <strong>Modern Travellers Lanka</strong>! Your payment has been successfully received.</p>

          <h3 style="color:#065F46; border-bottom:1px solid #D1FAE5; padding-bottom:5px;">Order & Payment Details</h3>
          <p style="font-size:14px;"><strong>Order ID:</strong> ${payment.order_id}</p>
          <p style="font-size:14px;"><strong>Date:</strong> ${new Date(payment.created_at).toLocaleDateString()}</p>
          <p style="font-size:14px;"><strong>Payment Type:</strong> ${payment.paymentType}</p>
          <p style="font-size:14px;"><strong>Amount:</strong> ${payment.currency} ${payment.amount}</p>

          <h3 style="color:#065F46; border-bottom:1px solid #D1FAE5; padding-bottom:5px;">Trip Details</h3>
          <p style="font-size:14px;"><strong>Trip Name:</strong> ${payment.customer.tripName}</p>

          <h3 style="color:#065F46; border-bottom:1px solid #D1FAE5; padding-bottom:5px;">Customer Details</h3>
          <p style="font-size:14px;"><strong>Name:</strong> ${payment.customer.first_name} ${payment.customer.last_name}</p>
          <p style="font-size:14px;"><strong>Email:</strong> ${payment.customer.email}</p>
          <p style="font-size:14px;"><strong>Phone:</strong> ${payment.customer.phone}</p>

          <p style="text-align:center; margin-top:30px; color:#047857; font-weight:bold;">We look forward to serving you on your trip!</p>
          <p style="text-align:center; font-size:12px; color:#6B7280;">Visit us at: <a href="https://moderntravellerslanka.com" style="color:#047857; text-decoration:none;">moderntravellerslanka.com</a></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent with premium receipt design' });
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

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${payment.order_id}.pdf`);
    doc.pipe(res);

    // Title
    doc
      .fillColor('#047857') // premium emerald green
      .fontSize(26)
      .text('Payment Receipt', { align: 'center', underline: true });
    doc.moveDown(1.5);

    // Customer & Trip Info Box
    doc
      .fillColor('#000000')
      .fontSize(12)
      .text(`Order ID: ${payment.order_id}`, { continued: true })
      .text(`   Date: ${new Date(payment.created_at).toLocaleDateString()}`, { align: 'right' });
    doc.moveDown(0.5);

    doc
      .fillColor('#111827')
      .fontSize(14)
      .text('Customer Details', { underline: true });
    doc
      .fontSize(12)
      .text(`Name: ${payment.customer.first_name} ${payment.customer.last_name}`)
      .text(`Email: ${payment.customer.email}`)
      .text(`Phone: ${payment.customer.phone}`);
    doc.moveDown(0.8);

    doc
      .fontSize(14)
      .text('Trip & Payment Details', { underline: true });
    doc
      .fontSize(12)
      .text(`Trip Name: ${payment.customer.tripName}`)
      .text(`Payment Type: ${payment.paymentType}`)
      .text(`Amount Paid: ${payment.currency} ${payment.amount}`);
    doc.moveDown(1);

    // Footer
    doc
      .fontSize(12)
      .fillColor('#047857')
      .text('Thank you for booking with Modern Travellers Lanka!', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor('#6B7280')
      .text('Visit us at: https://moderntravellerslanka.com', { align: 'center' });
    
    doc.end();
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};
export { getBooking, sendEmailReceipt, downloadReceipt };