import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WhackAMoleApp } from "./WhackAMoleApp.jsx";

const rootElement = document.querySelector("#root");
if (!rootElement) throw new Error("Reactの描画先#rootが見つかりません。");

createRoot(rootElement).render(
  <StrictMode>
    <WhackAMoleApp />
  </StrictMode>,
);
