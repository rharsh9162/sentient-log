"use client";

import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="login-grid" />
      </div>

      <div className="login-container">
        <SignUp
          routing="hash"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "clerk-root-box",
              cardBox: "clerk-card-box",
              card: "clerk-card",
            },
          }}
        />
      </div>
    </div>
  );
}
