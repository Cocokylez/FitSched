import type { MetadataRoute } from "next"

const BASE = "https://fitsched.vercel.app"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE,               lastModified: new Date(), changeFrequency: "monthly", priority: 1.0 },
    { url: `${BASE}/login`,    lastModified: new Date(), changeFrequency: "yearly",  priority: 0.5 },
    { url: `${BASE}/register`, lastModified: new Date(), changeFrequency: "yearly",  priority: 0.5 },
    { url: `${BASE}/privacy`,  lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/terms`,    lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  ]
}
