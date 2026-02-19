# 💎 Digital Asset Marketplace

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge&logo=none)
![Status](https://img.shields.io/badge/status-production-success?style=for-the-badge&logo=constant-contact)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge&logo=open-source-initiative)
![Security](https://img.shields.io/badge/security-PCI%20DSS-red?style=for-the-badge&logo=security-scorecard)

> **The next-generation e-commerce platform for high-frequency digital asset trading.**

---

## 🚀 Overview

**Digital Asset Marketplace** is an enterprise-grade solution designed to revolutionize the **sale and delivery of digital goods**. By automating the entire lifecycle from payment processing to instant asset delivery we bridge the gap between traditional manual workflows and modern, scalable e-commerce.

The platform eliminates bottlenecks in manual operations, ensuring **instant fulfillment** and a **frictionless user experience**.

---

## 🎯 The Problem & Solution

### 🛑 The Challenge: "Success Disaster"

Rapid growth led to operational chaos. Manual verification of payments and delivery via WhatsApp became unsustainable, causing:

- 📉 **Scalability Bottlenecks** (Limited by human speed)
- ⚠️ **High Error Rates** (Fraud & incorrect deliveries)
- ⏳ **Poor UX** (Wait times for customers)

### ✅ The Solution: Hybrid Automation

We engineered a **robotic fulfillment system** that works 24/7:

1.  **⚡ Instant Checkout**: Sub-2s transaction processing.
2.  **💸 Embedded Finance**: Direct banking integration (Asaas) for real-time settlement.
3.  **🤖 Smart Routing**: Complex cases are automatically escalated to human agents via WhatsApp.

---

## ✨ Key Features

| Feature                    | Description                                                                                  |
| :------------------------- | :------------------------------------------------------------------------------------------- |
| **🛍️ Marketplace Engine**  | High-performance catalog with caching, optimistic UI, and instant search.                    |
| **⚡ Event-Driven Core**   | Webhook-based architecture ensures assets are released the millisecond payment is confirmed. |
| **🛡️ Enterprise Security** | RBAC (Role-Based Access Control), RLS (Row Level Security), and PII masking.                 |
| **📲 Mobile Optimization** | Responsive design tailored for seamless mobile purchasing.                                   |
| **📊 Seller Dashboard**    | comprehensive tools for inventory management, image optimization, and analytics.             |
| **💳 Fintech Integration** | Dynamic Pix QR Codes, fraud detection, and automated settlement.                             |

---

## 🛠️ Tech Stack

### **Frontend**

![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Shadcn UI](https://img.shields.io/badge/Shadcn_UI-000000?style=flat&logo=shadcnui&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=flat&logo=react-query&logoColor=white)

### **Backend & Services**

![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- **Node.js** (v18+)
- **Supabase** Account
- **Asaas** API Keys (Sandbox for testing)

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/GabrielVictorP/digital-asset-marketplace.git
    cd digital-asset-marketplace
    ```

2.  **Install Dependencies**

    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:

    ```bash
    cp .env.example .env
    ```

    Populate it with your credentials:

    ```env
    # Supabase
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key

    # App Config
    VITE_APP_NAME="Digital Marketplace"
    VITE_WHATSAPP_NUMBER=5511999999999
    ```

# Your admin email for RBAC (Role-Based Access Control)
    VITE_ADMIN_EMAIL=admin@example.com
    ```

    # Payments (Asaas)
    VITE_ASAAS_API_KEY=your_api_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:8080`.

---

## 📂 Project Structure

```bash
digital-asset-marketplace/
├── public/              # 📦 Static assets
├── src/
│   ├── api/            # 📡 API integration (Asaas, etc.)
│   ├── components/     # 🧩 React components
│   │   ├── ui/        #    Atomic UI elements (Shadcn)
│   │   ├── checkout/  #    Checkout flows
│   │   └── ...
│   ├── contexts/       # ⚛️ React Contexts (Auth, Cart, etc.)
│   ├── hooks/          # 🪝 Custom Hooks
│   ├── lib/            # 🛠️ Utilities & Helpers
│   ├── pages/          # 📄 Route Components
│   ├── services/       # 💼 Business Logic
│   └── types/          # 📐 TypeScript Definitions
└── ...
```

---

## 🔐 Security Architecture

- **HTTPS Only**: Secure transport for all data.
- **Environment Variables**: Sensitive keys are never hardcoded.
- **RLS Policies**: Data access is controlled at the database level.
- **Edge Functions**: Sensitive operations run in a secure serverless environment.
- **Input Validation**: Strict Zod schemas for all user inputs.

---

## 🤝 Contributing

Contributions are welcome! This is a portfolio project, but feel free to suggest improvements.

1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/GabrielVictorP">Gabriel Victor</a>
</p>
