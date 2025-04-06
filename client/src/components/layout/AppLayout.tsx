import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
