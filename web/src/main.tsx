import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";
import "@fontsource/public-sans/800.css";
import "./theme.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
