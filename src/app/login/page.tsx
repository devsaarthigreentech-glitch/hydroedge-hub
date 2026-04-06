// // src/app/login/page.tsx
// "use client";

// import { useState } from "react";
// import { signIn } from "next-auth/react";
// import { useRouter } from "next/navigation";

// export default function LoginPage() {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const router = useRouter();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     const result = await signIn("credentials", {
//       username,
//       password,
//       redirect: false,
//     });

//     setLoading(false);

//     if (result?.error) {
//       setError("Invalid username or password");
//     } else {
//       router.push("/portal");
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-slate-950">
//       <div className="w-full max-w-md">
//         {/* Logo / Brand */}
//         <div className="text-center mb-8">
//           <h1 className="text-3xl font-bold text-white tracking-tight">
//             Hydroedge<span className="text-emerald-400"> Hub</span>
//           </h1>
//           <p className="text-slate-400 mt-2 text-sm">Fleet Management Portal</p>
//         </div>

//         {/* Login Card */}
//         <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
//           <h2 className="text-xl font-semibold text-white mb-6">Sign in</h2>

//           {error && (
//             <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
//               {error}
//             </div>
//           )}

//           <form className="space-y-5">
//             <div>
//               <label className="block text-sm font-medium text-slate-300 mb-1.5">
//                 Username or Email
//               </label>
//               <input
//                 type="text"
//                 value={username}
//                 onChange={(e) => setUsername(e.target.value)}
//                 required
//                 className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
//                 placeholder="Enter username or email"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-slate-300 mb-1.5">
//                 Password
//               </label>
//               <input
//                 type="password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 required
//                 className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
//                 placeholder="Enter password"
//               />
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
//             >
//               {loading ? "Signing in..." : "Sign In"}
//             </button>
//           </form>
//         </div>

//         <p className="text-center text-slate-600 text-xs mt-6">
//           SGT Hydroedge &copy; {new Date().getFullYear()}
//         </p>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
  
    const { signIn } = await import("next-auth/react");
  
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
  
    setLoading(false);
  
    if (result?.error) {
      setError("Invalid username or password");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      }}
    >
      <div style={{ width: "100%", maxWidth: "450px", padding: "0 20px" }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#fff", margin: 0 }}>
            GreenVision<span style={{ color: "#00c853" }}> Admin Panel</span>
          </h1>
          <p style={{ color: "#666", marginTop: "8px", fontSize: "13px" }}>
            Fleet Management Portal
          </p>
        </div>

        {/* Login Card */}
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: "12px",
            padding: "32px",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#fff", marginTop: 0, marginBottom: "24px" }}>
            Sign in
          </h2>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444",
                fontSize: "13px",
                padding: "10px 14px",
                borderRadius: "8px",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#999", marginBottom: "6px" }}>
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username or email"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#222",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#999", marginBottom: "6px" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#222",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                background: loading ? "#1a5c2a" : "#00c853",
                color: loading ? "#999" : "#000",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "bold",
                fontFamily: "inherit",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#444", fontSize: "11px", marginTop: "24px" }}>
          SGT Hydroedge © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}