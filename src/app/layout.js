
import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter" 
});

const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  weight: ["600", "700", "900"],
  variable: "--font-playfair" 
});

export const metadata = {
 title: "Aba Crafts — Handmade in Aba, Loved Worldwide",
  description: "Aba Craft is Nigeria's premier marketplace for authentic handmade leather shoes, bags, garments and more — crafted by Aba's finest artisans.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}

    >
      <body className="bg-[#F4F4F4] text-black">



        {children}


        <ToastContainer
          position="top-right"
          autoClose={6000}
          theme="dark"
          toastStyle={{
            background: "#111827", // dark gray
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            fontSize: "14px",
            fontWeight: "500",
            padding: "14px 16px",
            minWidth: "340px",
            transform: "translateY(10px)",
          }}
          bodyClassName="font-semibold  tracking-wide"
          progressStyle={{
            background: "#3b82f6", // blue progress bar
            height: "3px"
          }}

        />

      </body>
    </html>
  );
}
