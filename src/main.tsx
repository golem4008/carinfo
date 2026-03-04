import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from 'sonner';
import App from "./App";
import "./index.css";

// 确保root元素存在，并提供更健壮的错误处理
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found");
  // 创建一个备用的根元素，确保应用能够运行
  const fallbackRoot = document.createElement('div');
  fallbackRoot.id = 'root';
  document.body.appendChild(fallbackRoot);
  document.body.style.margin = '0';
  document.body.style.padding = '0';
}

// 再次获取根元素（可能是新创建的）
const actualRootElement = document.getElementById("root");
if (actualRootElement) {
  createRoot(actualRootElement).render(
    <StrictMode>
      {/* 由于在index.html中已经设置了base标签，这里不需要额外的basename */}
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
    </StrictMode>
  );
} else {
  console.error("Failed to create root element");
}
