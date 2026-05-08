"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      name,
      email,
      password,
      action: "register",
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Email already registered or password too weak")
    } else {
      router.push("/schedule")
    }
  }

  const handleGoogle = () => {
    signIn("google", { callbackUrl: "/schedule" })
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1a1a1a", display: "flex", flexDirection: "column", position: "relative" }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          height: "40vh",
          background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <div style={{ fontSize: "32px", fontWeight: 900, color: "white", letterSpacing: "-1px" }}>FitSched</div>
        <div style={{ fontSize: "13px", color: "#888888", marginTop: "6px" }}>Start your journey.</div>
      </motion.div>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        style={{
          background: "#242424",
          borderRadius: "28px 28px 0 0",
          padding: "32px 24px 40px",
          position: "relative",
          zIndex: 2,
          marginTop: "-28px",
          flex: 1,
        }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        >
          <motion.div variants={fadeIn}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "white", marginBottom: "4px" }}>Create account</div>
            <div style={{ fontSize: "13px", color: "#888888", marginBottom: "24px" }}>It&apos;s free, always.</div>
          </motion.div>

          <form onSubmit={handleSubmit}>
            {error && (
              <motion.div variants={fadeIn}>
                <div style={{
                  background: "#2f2f2f",
                  border: "1px solid #ff4444",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  color: "#ff6666",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}>
                  {error}
                </div>
              </motion.div>
            )}

            <motion.div variants={fadeIn}>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "#888888", marginBottom: "6px" }}>NAME</div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                style={{
                  background: "#2f2f2f",
                  border: "1px solid #383838",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                  width: "100%",
                  marginBottom: "16px",
                  boxSizing: "border-box" as const,
                }}
              />
            </motion.div>

            <motion.div variants={fadeIn}>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "#888888", marginBottom: "6px" }}>EMAIL</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect="off"
                required
                style={{
                  background: "#2f2f2f",
                  border: "1px solid #383838",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                  width: "100%",
                  marginBottom: "16px",
                  boxSizing: "border-box" as const,
                }}
              />
            </motion.div>

            <motion.div variants={fadeIn}>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "#888888", marginBottom: "6px" }}>PASSWORD</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                style={{
                  background: "#2f2f2f",
                  border: "1px solid #383838",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  color: "white",
                  fontSize: "14px",
                  outline: "none",
                  width: "100%",
                  marginBottom: "24px",
                  boxSizing: "border-box" as const,
                }}
              />
            </motion.div>

            <motion.div variants={fadeIn}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: "white",
                  color: "#1a1a1a",
                  border: "none",
                  borderRadius: "12px",
                  padding: "15px",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginBottom: "20px",
                  opacity: loading ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: 16, height: 16, borderRadius: "50%",
                      border: "2px solid rgba(0,0,0,0.15)",
                      borderTopColor: "#1a1a1a",
                      animation: "spin 0.6s linear infinite",
                      display: "inline-block",
                    }} />
                    Creating account...
                  </>
                ) : "Sign Up"}
              </button>
            </motion.div>
          </form>

          <motion.div variants={fadeIn}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <hr style={{ flex: 1, border: "none", borderTop: "1px solid #333333" }} />
              <span style={{ fontSize: "11px", color: "#888888" }}>or continue with</span>
              <hr style={{ flex: 1, border: "none", borderTop: "1px solid #333333" }} />
            </div>
          </motion.div>

          <motion.div variants={fadeIn}>
            <button
              onClick={handleGoogle}
              style={{
                width: "100%",
                background: "#2f2f2f",
                border: "1px solid #383838",
                borderRadius: "12px",
                padding: "14px",
                color: "white",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginBottom: "24px",
              }}
            >
              <img src="/google.svg" width={16} height={16} alt="Google" />
              Continue with Google
            </button>
          </motion.div>

          <motion.div variants={fadeIn}>
            <p style={{ textAlign: "center", fontSize: "12px", color: "#888888", margin: 0 }}>
              Already have an account?{" "}
              <span
                style={{ color: "white", fontWeight: 700, cursor: "pointer" }}
                onClick={() => router.push("/login")}
              >
                Sign In
              </span>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
