// Root-level Suspense boundary — the inline splash in layout.tsx already covers
// initial load, so this just needs to be an invisible black backdrop that won't
// flash through when the splash fades.
export default function Loading() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000",
      zIndex: 9998,
    }} />
  )
}
