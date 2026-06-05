import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GiDi",
    short_name: "GiDi",
    description: "Sistema de seguimiento para terapeutas y padres",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f14",
    theme_color: "#F38A1D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
