import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PostPilot",
    short_name: "PostPilot",
    description: "Posting Instagram & TikTok dari satu tempat.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e14",
    theme_color: "#0a0e14",
    icons: [
      { src: "/brand/logo-square.png", sizes: "391x388", type: "image/png" },
    ],
  };
}
