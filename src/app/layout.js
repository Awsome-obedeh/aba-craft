
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


export const metadata = {
 title: "Abia Crafts - Handmade in Aba, Loved Worldwide",
  description: "Aba Craft is Nigeria's premier marketplace for authentic handmade leather shoes, bags, garments and more — crafted by Aba's finest artisans.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className="h-full antialiased text-black"

    >
      <body className="bg-cream text-brandText">



        {children}


        <ToastContainer
          position="top-right"
          autoClose={6000}
          theme="dark"
          toastStyle={{
            background: "#1E3329", // dark gray
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            fontSize: "14px",
            fontWeight: "500",
            padding: "14px 16px",
            minWidth: "340px",
            transform: "translateY(10px)",
          }}
          bodyClassName="font-semibold  tracking-wide"
          progressStyle={{
            background: "#C9A84C", // blue progress bar
            height: "3px"
          }}

        />

      </body>
    </html>
  );
}
