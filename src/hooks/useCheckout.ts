import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { BRAND } from "../config/brand";
import type { Course } from "../types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Razorpay checkout — moved here unchanged from CourseDetail.tsx so that the
 * course detail page AND the "Buy Now" button on course cards use exactly the
 * same, server-verified flow:
 *
 *   1. POST /api/create-order  (course id only — price is read server-side)
 *   2. Open Razorpay Checkout
 *   3. POST /api/verify-payment (signature checked server-side, enrollment created there)
 *
 * Buying one course never touches enrollments for any other course.
 */
export function useCheckout(opts: { onPurchased?: (course: Course) => void } = {}) {
  const { session, user, profile } = useAuth();
  const navigate = useNavigate();

  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  async function buy(course: Course) {
    if (!session) {
      navigate("/login", { state: { from: `/courses/${course.slug}` } });
      return;
    }

    setBuyingId(course.id);
    setActiveCourseId(course.id);
    setError(null);
    setStatusMsg(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Could not load the payment SDK. Check your connection.");

      // 1. Ask OUR backend to create the order. We send only the course id —
      //    the price is looked up server-side from the database.
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ courseId: course.id }),
      });
      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || "Could not start checkout");

      // 2. Open Razorpay Checkout using the order it created.
      const rzp = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: BRAND.name,
        description: orderData.courseTitle,
        image: new URL(BRAND.logo, window.location.origin).href,
        order_id: orderData.razorpayOrderId,
        prefill: { email: user?.email ?? "", name: profile?.full_name ?? "" },
        theme: { color: BRAND.checkoutThemeColor },
        handler: async (response: any) => {
          setStatusMsg("Payment received — verifying...");
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
            setStatusMsg("Payment Successful — Course Unlocked!");
            opts.onPurchased?.(course);
            setTimeout(() => navigate("/dashboard", { state: { justPurchased: course.id } }), 1200);
          } catch (e: any) {
            setStatusMsg(
              "Payment is being verified. If this takes more than a few minutes, check your dashboard or contact support."
            );
          }
        },
        modal: {
          ondismiss: () => setBuyingId(null),
        },
      });
      rzp.open();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setBuyingId(null);
    }
  }

  return { buy, buyingId, error, statusMsg, activeCourseId };
}
