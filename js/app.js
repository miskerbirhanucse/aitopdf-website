// ============================================
// AI to PDF — Shared App Script
// ============================================

// --- CONFIG (replace with your values) ---
const SUPABASE_URL = "https://vbynrwuryougpglzrehh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mrpCSzCRyyDX1RjJ20Xt1A_V9iWmfqQ";

// --- INIT SUPABASE ---
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- INJECT NAV CSS ---
function injectNavCSS() {
  if (document.getElementById("shared-nav-css")) return;
  const style = document.createElement("style");
  style.id = "shared-nav-css";
  style.textContent = `
    :root {
      --primary: #667eea;
      --primary-dark: #5a6fd6;
      --ink: #6868c9;
      --muted: #5a5f80;
      --border: rgba(26, 59, 255, 0.12);
      --grad: linear-gradient(135deg, #667eea 0%, #5a6fd6 100%);
      --off: #f4f5ff;
    }
    nav {
      position: fixed; top: 0; width: 100%; z-index: 100;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      padding: 0 32px;
    }
    .nav-inner {
      max-width: 1140px; margin: 0 auto;
      display: flex; align-items: center;
      justify-content: space-between; height: 64px;
    }
    .nav-logo {
      display: flex; align-items: center; gap: 10px;
      text-decoration: none; font-family: "Syne", sans-serif;
      font-weight: 800; font-size: 20px; color: var(--ink);
    }
    .nav-links { display: flex; gap: 28px; align-items: center; }
    .nav-links a {
      text-decoration: none; color: var(--muted);
      font-weight: 500; font-size: 14px; transition: color 0.2s;
    }
    .nav-links a:hover { color: var(--primary); }
    .nav-cta {
      background: var(--grad) !important; color: white !important;
      padding: 9px 22px; border-radius: 10px;
      font-weight: 600 !important;
      box-shadow: 0 4px 14px rgba(26, 59, 255, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .nav-cta:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(26, 59, 255, 0.4);
    }
    @media (max-width: 768px) {
      .nav-links a:not(.nav-cta) { display: none; }
      nav { padding: 0 16px; }
    }
  `;
  document.head.appendChild(style);
}

// --- RENDER NAVBAR ---
function renderNav(user) {
  // Remove existing nav
  const existing = document.querySelector("nav");
  if (existing) existing.remove();

  const nav = document.createElement("nav");
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">AI to PDF</a>
      <div class="nav-links">
        <a href="index.html">Home</a>
        <a href="pricing.html">Pricing</a>
        ${
          user
            ? `<a href="account.html" class="nav-cta">My Account →</a>`
            : `<a href="login.html" class="nav-cta">Login →</a>`
        }
      </div>
    </div>
  `;

  document.body.prepend(nav);
}

// --- GET USER PROFILE ---
async function getUserProfile() {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) return null;

  const { data: profile } = await sb
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return {
    ...session.user,
    profile: profile || { plan: "free" },
  };
}

// --- INIT APP ---
async function initApp() {
  injectNavCSS();

  const {
    data: { session },
  } = await sb.auth.getSession();
  renderNav(session?.user || null);

  // Listen for auth changes (login/logout)
  sb.auth.onAuthStateChange((event, session) => {
    renderNav(session?.user || null);

    // After login, redirect to account page
    if (event === "SIGNED_IN" && window.location.pathname.includes("login")) {
      window.location.href = "account.html";
    }
  });
}

// --- RUN ---
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// ============================================
// Extension Auto-Sync
// ============================================

// Development ID (from chrome://extensions)
// Production ID (from Chrome Web Store)
const EXTENSION_IDS = [
  'nlkppjdiffagligkihbkfeanfngpckjj',        // ← dev mode ID
  'your_published_id_here',  // ← Chrome Web Store ID (add later)
];

async function syncToExtension(email) {
  for (const id of EXTENSION_IDS) {
    try {
      chrome.runtime.sendMessage(id, 
        { action: 'activate', email: email },
        (response) => {
          if (chrome.runtime.lastError) return; // this ID didn't work
          if (response?.success) {
            console.log('Extension synced! Plan:', response.plan);
          }
        }
      );
    } catch {
      // This ID not available, try next
    }
  }
}

async function desyncExtension() {
  for (const id of EXTENSION_IDS) {
    try {
      chrome.runtime.sendMessage(id, { action: 'deactivate' }, () => {
        if (chrome.runtime.lastError) return;
      });
    } catch {}
  }
}

// Auto-sync when user logs in on website
sb.auth.onAuthStateChange((event, session) => {
  renderNav(session?.user || null);

  if (event === 'SIGNED_IN' && session?.user?.email) {
    syncToExtension(session.user.email);

    if (window.location.pathname.includes('login')) {
      window.location.href = 'account.html';
    }
  }

  if (event === 'SIGNED_OUT') {
    desyncExtension();
  }
});